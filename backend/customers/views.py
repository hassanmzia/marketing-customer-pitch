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
        serializer = CustomerDetailSerializer(customer)
        data = serializer.data

        # Enrich with pitch data if available
        from pitches.models import Pitch
        pitches = Pitch.objects.filter(customer=customer, is_active=True)
        data['pitch_summary'] = {
            'total_pitches': pitches.count(),
            'approved_pitches': pitches.filter(status='approved').count(),
            'average_score': None,
        }

        # Trigger async enrichment if customer_360_data is empty
        if not customer.customer_360_data:
            enrich_customer_data.delay(str(customer.id))
            data['enrichment_status'] = 'in_progress'
        else:
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
