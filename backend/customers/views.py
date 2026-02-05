"""
Customer views.
"""
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny  # TODO: Replace with proper auth
from rest_framework.response import Response

from .models import Customer, CustomerInteraction
from .serializers import (
    CustomerDetailSerializer,
    CustomerImportSerializer,
    CustomerInteractionSerializer,
    CustomerSerializer,
)
from .tasks import enrich_customer_data


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customers.
    Supports full CRUD plus customer_360, import, and search actions.
    """
    queryset = Customer.objects.filter(is_active=True)
    serializer_class = CustomerSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['industry', 'status', 'company_size']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerSerializer

    @action(detail=True, methods=['get'], url_path='customer-360')
    def customer_360(self, request, pk=None):
        """
        Retrieve full 360-degree view of a customer including interactions,
        pitch history, and enriched data.
        """
        customer = self.get_object()

        # If 360 data is empty, build basic enrichment synchronously so the
        # view always returns useful data on the first request.  The async
        # task is still fired for AI-powered enrichment upgrade.
        if not customer.customer_360_data:
            last_interaction = customer.interactions.order_by('-created_at').first()
            enrichment = {
                'company_profile': {
                    'name': customer.company,
                    'industry': customer.industry,
                    'size': customer.company_size,
                    'website': customer.website,
                },
                'contact_info': {
                    'primary_contact': customer.name,
                    'email': customer.email,
                    'phone': customer.phone,
                },
                'engagement_summary': {
                    'total_interactions': customer.interactions.count(),
                    'last_interaction': (
                        last_interaction.created_at.isoformat()
                        if last_interaction else None
                    ),
                    'sentiment_trend': 'neutral',
                },
                'enrichment_source': 'internal',
                'enrichment_complete': True,
            }
            customer.customer_360_data = enrichment
            customer.save(update_fields=['customer_360_data', 'updated_at'])
            # Kick off AI enrichment upgrade in the background
            enrich_customer_data.delay(str(customer.id))

        serializer = CustomerDetailSerializer(customer)
        data = serializer.data

        # Enrich with pitch data
        from pitches.models import Pitch
        pitches = Pitch.objects.filter(customer=customer, is_active=True)
        scored_pitches = pitches.exclude(scores={})
        avg_score = None
        if scored_pitches.exists():
            from django.db.models import Avg
            scores = [p.average_score for p in scored_pitches if p.average_score is not None]
            if scores:
                avg_score = round(sum(scores) / len(scores), 2)

        data['pitch_summary'] = {
            'total_pitches': pitches.count(),
            'approved_pitches': pitches.filter(status='approved').count(),
            'average_score': avg_score,
        }

        data['enrichment_status'] = 'complete'

        return Response(data)

    @action(detail=False, methods=['post'], url_path='import')
    def import_customers(self, request):
        """Bulk import customers from a list."""
        serializer = CustomerImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customers = serializer.save()
        return Response(
            {
                'message': f'Successfully imported {len(customers)} customers',
                'customer_ids': [str(c.id) for c in customers],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        Search customers by name, company, industry, or description.
        Query parameter: ?q=search_term
        """
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response(
                {'error': 'Query parameter "q" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(
            Q(name__icontains=q) |
            Q(company__icontains=q) |
            Q(industry__icontains=q) |
            Q(description__icontains=q) |
            Q(email__icontains=q)
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CustomerInteractionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing customer interactions."""
    queryset = CustomerInteraction.objects.filter(is_active=True)
    serializer_class = CustomerInteractionSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['customer', 'interaction_type']
