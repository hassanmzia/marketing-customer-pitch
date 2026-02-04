"""
Analytics views.
"""
from datetime import timedelta

from django.db import models
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny  # TODO: Replace with proper auth
from rest_framework.response import Response

from .models import AgentPerformance, DashboardMetric, PitchAnalytics
from .serializers import (
    AgentPerformanceSerializer,
    DashboardMetricSerializer,
    PitchAnalyticsSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])  # TODO: Replace with proper auth
def dashboard(request):
    """
    Main dashboard view returning aggregated metrics.
    """
    from agents.models import AgentExecution
    from campaigns.models import Campaign
    from customers.models import Customer
    from pitches.models import Pitch

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    # Gather aggregate data
    total_customers = Customer.objects.filter(is_active=True).count()
    total_pitches = Pitch.objects.filter(is_active=True).count()
    active_campaigns = Campaign.objects.filter(
        is_active=True, status='active'
    ).count()

    # Recent pitch stats
    recent_pitches = Pitch.objects.filter(
        is_active=True, created_at__gte=thirty_days_ago
    )
    pitches_generated = recent_pitches.count()
    pitches_approved = recent_pitches.filter(status='approved').count()

    # Agent stats
    recent_executions = AgentExecution.objects.filter(
        created_at__gte=thirty_days_ago
    )
    total_executions = recent_executions.count()
    successful_executions = recent_executions.filter(status='completed').count()
    avg_tokens = recent_executions.filter(
        status='completed'
    ).aggregate(avg=Avg('tokens_used'))['avg'] or 0

    # Conversion data from pitch analytics
    analytics_data = PitchAnalytics.objects.filter(is_active=True)
    total_conversions = analytics_data.filter(conversion=True).count()
    avg_response_rate = analytics_data.aggregate(
        avg=Avg('response_rate')
    )['avg'] or 0

    # Latest dashboard metrics
    latest_metrics = DashboardMetric.objects.filter(
        is_active=True
    ).order_by('-date')[:10]

    metrics_data = DashboardMetricSerializer(latest_metrics, many=True).data

    # Compute average score from pitches
    from pitches.models import PitchScore
    avg_score_val = PitchScore.objects.filter(
        is_active=True,
    ).aggregate(avg=Avg('score'))['avg']

    # Pitch trend chart: daily counts for last 7 days
    from django.db.models.functions import TruncDate
    seven_days_ago = now - timedelta(days=7)
    daily_counts = (
        Pitch.objects.filter(is_active=True, created_at__gte=seven_days_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    # Build a complete 7-day series (fill missing days with 0)
    pitch_trend_chart = []
    counts_by_date = {
        entry['date']: entry['count'] for entry in daily_counts
    }
    for i in range(7):
        day = (now - timedelta(days=6 - i)).date()
        pitch_trend_chart.append({
            'date': day.strftime('%b %d'),
            'count': counts_by_date.get(day, 0),
        })

    approval_rate = (
        pitches_approved / pitches_generated
        if pitches_generated > 0 else 0
    )
    agent_success_rate = (
        successful_executions / total_executions
        if total_executions > 0 else 0
    )

    return Response({
        # Flat fields expected by frontend KPI cards
        'total_customers': total_customers,
        'total_pitches': total_pitches,
        'active_campaigns': active_campaigns,
        'avg_score': avg_score_val,
        'avg_pitch_score': avg_score_val,
        'conversion_rate': round(avg_response_rate, 4),
        'agent_efficiency': agent_success_rate,
        'pitch_trend': None,
        'score_trend': None,
        'conversion_trend': None,
        'efficiency_trend': None,
        'customer_trend': None,
        'campaign_trend': None,
        'campaign_roi': [
            {
                'name': c.name,
                'value': c.targets.count(),
            }
            for c in Campaign.objects.filter(is_active=True)[:10]
            if c.targets.count() > 0
        ] or [
            {
                'name': c.name,
                'value': 1,
            }
            for c in Campaign.objects.filter(is_active=True)[:5]
        ],
        'pitch_trend_chart': pitch_trend_chart,
        'engagement_heatmap': [],
        # Nested data still available
        'summary': {
            'total_customers': total_customers,
            'total_pitches': total_pitches,
            'active_campaigns': active_campaigns,
            'pitches_generated_30d': pitches_generated,
            'pitches_approved_30d': pitches_approved,
            'approval_rate': approval_rate,
        },
        'agent_stats': {
            'total_executions_30d': total_executions,
            'successful_executions_30d': successful_executions,
            'success_rate': agent_success_rate,
            'avg_tokens_per_execution': round(avg_tokens, 1),
        },
        'conversion_stats': {
            'total_conversions': total_conversions,
            'avg_response_rate': round(avg_response_rate, 4),
        },
        'recent_metrics': metrics_data,
        'generated_at': now.isoformat(),
    })


class PitchAnalyticsViewSet(viewsets.ModelViewSet):
    """ViewSet for pitch analytics."""
    queryset = PitchAnalytics.objects.filter(is_active=True).select_related('pitch')
    serializer_class = PitchAnalyticsSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['pitch', 'conversion', 'a_b_test_group']

    def list(self, request, *args, **kwargs):
        """
        Override list to return the summary format the frontend expects:
        { trends, score_distribution, top_pitches, results }
        """
        from pitches.models import Pitch, PitchScore

        # Standard paginated results
        response = super().list(request, *args, **kwargs)

        # Build trends: daily pitch counts for last 30 days
        days = int(request.query_params.get('days', '30'))
        cutoff = timezone.now() - timedelta(days=days)

        from django.db.models import Q
        from django.db.models.functions import TruncDate
        daily_counts = (
            Pitch.objects.filter(is_active=True, created_at__gte=cutoff)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        trends = []
        for entry in daily_counts:
            approved_count = Pitch.objects.filter(
                is_active=True, created_at__date=entry['date'], status='approved'
            ).count()
            trends.append({
                'date': entry['date'].strftime('%b %d') if entry['date'] else '',
                'count': entry['count'],
                'approved': approved_count,
            })

        # Build score distribution
        score_ranges = [
            ('0-20%', 0, 0.2),
            ('20-40%', 0.2, 0.4),
            ('40-60%', 0.4, 0.6),
            ('60-80%', 0.6, 0.8),
            ('80-100%', 0.8, 1.01),
        ]
        score_distribution = []
        for label, low, high in score_ranges:
            cnt = PitchScore.objects.filter(
                is_active=True, score__gte=low, score__lt=high
            ).count()
            score_distribution.append({'range': label, 'count': cnt})

        # Top pitches by score – average_score is a @property, not a DB
        # field, so annotate with the mean of related PitchScore rows.
        top_pitches = []
        top_scored = (
            Pitch.objects.filter(is_active=True, pitch_scores__isnull=False)
            .select_related('customer')
            .annotate(avg_score=Avg('pitch_scores__score'))
            .order_by('-avg_score')[:5]
        )
        for p in top_scored:
            top_pitches.append({
                'id': str(p.id),
                'title': p.title,
                'customer_name': getattr(p.customer, 'name', '') if p.customer else '',
                'overall_score': p.avg_score,
                'pitch_type': p.pitch_type,
                'created_at': p.created_at.isoformat() if p.created_at else None,
            })

        response.data = {
            'trends': trends,
            'score_distribution': score_distribution,
            'top_pitches': top_pitches,
            'results': response.data.get('results', response.data) if isinstance(response.data, dict) else response.data,
        }

        return response


class AgentPerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for agent performance metrics."""
    queryset = AgentPerformance.objects.filter(
        is_active=True
    ).select_related('agent_config')
    serializer_class = AgentPerformanceSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['agent_config', 'period', 'date']

    @action(detail=False, methods=['get'], url_path='trends')
    def trends(self, request):
        """Get performance trends for a specified period."""
        period = request.query_params.get('period', 'daily')
        days = int(request.query_params.get('days', '30'))
        cutoff = timezone.now().date() - timedelta(days=days)

        queryset = self.get_queryset().filter(
            period=period,
            date__gte=cutoff,
        ).order_by('date')

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'period': period,
            'days': days,
            'data': serializer.data,
        })

    @action(detail=False, methods=['get'], url_path='agent-comparison')
    def agent_comparison(self, request):
        """Compare performance across all agents."""
        from agents.models import AgentExecution

        period = request.query_params.get('period', 'monthly')

        # Try the AgentPerformance table first
        latest_metrics = AgentPerformance.objects.filter(
            is_active=True,
            period=period,
        ).values(
            'agent_config__name',
            'agent_config__agent_type',
        ).annotate(
            total_executions=Sum('total_executions'),
            successful_executions=Sum('successful_executions'),
            avg_tokens=Avg('avg_tokens'),
            avg_duration=Avg('avg_duration'),
            avg_quality=Avg('avg_quality_score'),
        ).order_by('-total_executions')

        comparison = []
        for metric in latest_metrics:
            total = metric['total_executions'] or 0
            successful = metric['successful_executions'] or 0
            comparison.append({
                'name': metric['agent_config__name'],
                'agent_name': metric['agent_config__name'],
                'agent_type': metric['agent_config__agent_type'],
                'total_executions': total,
                'successful_executions': successful,
                'success_rate': successful / total if total > 0 else 0,
                'avg_tokens': round(metric['avg_tokens'] or 0, 1),
                'avg_duration': round(metric['avg_duration'] or 0, 2),
                'avg_quality_score': round(metric['avg_quality'] or 0, 3),
            })

        # Fallback: compute from AgentExecution records if no
        # pre-aggregated AgentPerformance rows exist.
        if not comparison:
            exec_metrics = (
                AgentExecution.objects
                .filter(agent_config__isnull=False)
                .values('agent_config__name', 'agent_config__agent_type')
                .annotate(
                    total=Count('id'),
                    successful=Count('id', filter=models.Q(status='completed')),
                    avg_tokens=Avg('tokens_used'),
                )
                .order_by('-total')
            )
            for m in exec_metrics:
                total = m['total'] or 0
                successful = m['successful'] or 0
                comparison.append({
                    'name': m['agent_config__name'],
                    'agent_name': m['agent_config__name'],
                    'agent_type': m['agent_config__agent_type'],
                    'total_executions': total,
                    'successful_executions': successful,
                    'success_rate': successful / total if total > 0 else 0,
                    'avg_tokens': round(m['avg_tokens'] or 0, 1),
                    'avg_duration': 0,
                    'avg_quality_score': 0,
                })

        return Response({
            'period': period,
            'comparison': comparison,
        })

    @action(detail=False, methods=['get'], url_path='roi-report')
    def roi_report(self, request):
        """Generate an ROI report for agent usage."""
        from agents.models import AgentExecution
        from campaigns.models import Campaign
        from pitches.models import Pitch

        days = int(request.query_params.get('days', '30'))
        cutoff = timezone.now() - timedelta(days=days)

        # Costs
        executions = AgentExecution.objects.filter(created_at__gte=cutoff)
        total_cost = executions.aggregate(total=Sum('cost'))['total'] or 0
        total_tokens = executions.aggregate(total=Sum('tokens_used'))['total'] or 0

        # Outputs
        pitches_created = Pitch.objects.filter(
            is_active=True, created_at__gte=cutoff
        ).count()
        pitches_approved = Pitch.objects.filter(
            is_active=True, created_at__gte=cutoff, status='approved'
        ).count()

        # Campaign performance
        campaign_conversions = PitchAnalytics.objects.filter(
            is_active=True, conversion=True, created_at__gte=cutoff
        ).count()

        # Campaign revenue (estimated from budget)
        campaigns = Campaign.objects.filter(
            is_active=True, status__in=['active', 'completed'],
        )
        total_budget = campaigns.aggregate(total=Sum('budget'))['total'] or 0

        return Response({
            'period_days': days,
            'costs': {
                'total_api_cost': float(total_cost),
                'total_tokens_used': total_tokens,
                'total_executions': executions.count(),
                'cost_per_execution': (
                    float(total_cost) / executions.count()
                    if executions.count() > 0 else 0
                ),
            },
            'outputs': {
                'pitches_created': pitches_created,
                'pitches_approved': pitches_approved,
                'approval_rate': (
                    pitches_approved / pitches_created
                    if pitches_created > 0 else 0
                ),
                'conversions': campaign_conversions,
            },
            'campaign_summary': {
                'total_campaigns': campaigns.count(),
                'total_budget': float(total_budget),
            },
            'efficiency': {
                'cost_per_pitch': (
                    float(total_cost) / pitches_created
                    if pitches_created > 0 else 0
                ),
                'cost_per_conversion': (
                    float(total_cost) / campaign_conversions
                    if campaign_conversions > 0 else 0
                ),
            },
        })


class DashboardMetricViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for dashboard metrics."""
    queryset = DashboardMetric.objects.filter(is_active=True)
    serializer_class = DashboardMetricSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['name', 'metric_type', 'period', 'date']
