"""
Campaign views.
"""
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny  # TODO: Replace with proper auth
from rest_framework.response import Response

from .models import Campaign, CampaignTarget
from .serializers import (
    AddTargetsSerializer,
    CampaignDetailSerializer,
    CampaignSerializer,
    CampaignTargetSerializer,
)
from .tasks import execute_campaign


class CampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing campaigns.
    Supports CRUD plus add_targets, launch, pause, and metrics actions.
    """
    queryset = Campaign.objects.filter(is_active=True)
    serializer_class = CampaignSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'campaign_type', 'target_industry']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CampaignDetailSerializer
        return CampaignSerializer

    @action(detail=True, methods=['post'], url_path='add-targets')
    def add_targets(self, request, pk=None):
        """Add customer targets to the campaign."""
        campaign = self.get_object()
        serializer = AddTargetsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer_ids = serializer.validated_data['customer_ids']
        created = []
        skipped = []

        for customer_id in customer_ids:
            target, was_created = CampaignTarget.objects.get_or_create(
                campaign=campaign,
                customer_id=customer_id,
                defaults={'status': 'pending'},
            )
            if was_created:
                created.append(str(customer_id))
            else:
                skipped.append(str(customer_id))

        return Response({
            'message': f'Added {len(created)} targets, skipped {len(skipped)} duplicates',
            'created': created,
            'skipped': skipped,
        })

    @action(detail=True, methods=['post'], url_path='launch')
    def launch(self, request, pk=None):
        """Launch the campaign, starting pitch generation for all targets."""
        campaign = self.get_object()

        if campaign.status not in ('draft', 'paused'):
            return Response(
                {'error': f'Cannot launch campaign with status: {campaign.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if campaign.targets.count() == 0:
            return Response(
                {'error': 'Campaign has no targets. Add targets before launching.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = 'active'
        campaign.start_date = campaign.start_date or timezone.now()
        campaign.save(update_fields=['status', 'start_date', 'updated_at'])

        # Trigger async campaign execution
        task = execute_campaign.delay(str(campaign.id))

        return Response({
            'message': 'Campaign launched successfully',
            'campaign_id': str(campaign.id),
            'task_id': task.id,
            'target_count': campaign.targets.count(),
        })

    @action(detail=True, methods=['post'], url_path='pause')
    def pause(self, request, pk=None):
        """Pause an active campaign."""
        campaign = self.get_object()

        if campaign.status != 'active':
            return Response(
                {'error': f'Cannot pause campaign with status: {campaign.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = 'paused'
        campaign.save(update_fields=['status', 'updated_at'])

        return Response({
            'message': 'Campaign paused',
            'campaign_id': str(campaign.id),
        })

    @action(detail=True, methods=['get'], url_path='metrics')
    def metrics(self, request, pk=None):
        """Get campaign performance metrics."""
        campaign = self.get_object()
        targets = campaign.targets.all()

        total = targets.count()
        pitched = targets.filter(status='pitched').count()
        responded = targets.filter(status='responded').count()
        converted = targets.filter(status='converted').count()
        rejected = targets.filter(status='rejected').count()

        metrics = {
            'campaign_id': str(campaign.id),
            'total_targets': total,
            'pitched': pitched,
            'responded': responded,
            'converted': converted,
            'rejected': rejected,
            'pitch_rate': pitched / total if total > 0 else 0,
            'response_rate': responded / total if total > 0 else 0,
            'conversion_rate': converted / total if total > 0 else 0,
            'rejection_rate': rejected / total if total > 0 else 0,
            'stored_metrics': campaign.metrics,
        }

        return Response(metrics)


class CampaignTargetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing campaign targets."""
    queryset = CampaignTarget.objects.filter(is_active=True).select_related(
        'campaign', 'customer'
    )
    serializer_class = CampaignTargetSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['campaign', 'customer', 'status']
