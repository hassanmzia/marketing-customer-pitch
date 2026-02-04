"""
Analytics Celery tasks for computing periodic metrics.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import Avg, Count, Sum
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def compute_daily_metrics():
    """Compute daily dashboard metrics."""
    from agents.models import AgentExecution
    from analytics.models import DashboardMetric
    from campaigns.models import Campaign
    from customers.models import Customer
    from pitches.models import Pitch

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    logger.info(f'Computing daily metrics for {yesterday}')

    # Pitches generated today
    pitches_count = Pitch.objects.filter(
        created_at__date=yesterday, is_active=True
    ).count()
    DashboardMetric.objects.update_or_create(
        name='pitches_generated', period='daily', date=yesterday,
        defaults={
            'metric_type': 'counter',
            'value': pitches_count,
        },
    )

    # Pitches approved
    approved_count = Pitch.objects.filter(
        created_at__date=yesterday, is_active=True, status='approved'
    ).count()
    DashboardMetric.objects.update_or_create(
        name='pitches_approved', period='daily', date=yesterday,
        defaults={
            'metric_type': 'counter',
            'value': approved_count,
        },
    )

    # New customers
    new_customers = Customer.objects.filter(
        created_at__date=yesterday, is_active=True
    ).count()
    DashboardMetric.objects.update_or_create(
        name='new_customers', period='daily', date=yesterday,
        defaults={
            'metric_type': 'counter',
            'value': new_customers,
        },
    )

    # Agent executions
    executions = AgentExecution.objects.filter(created_at__date=yesterday)
    exec_count = executions.count()
    success_count = executions.filter(status='completed').count()

    DashboardMetric.objects.update_or_create(
        name='agent_executions', period='daily', date=yesterday,
        defaults={
            'metric_type': 'counter',
            'value': exec_count,
        },
    )

    DashboardMetric.objects.update_or_create(
        name='agent_success_rate', period='daily', date=yesterday,
        defaults={
            'metric_type': 'percentage',
            'value': (success_count / exec_count * 100) if exec_count > 0 else 0,
        },
    )

    # Total API cost
    total_cost = executions.aggregate(total=Sum('cost'))['total'] or 0
    DashboardMetric.objects.update_or_create(
        name='api_cost', period='daily', date=yesterday,
        defaults={
            'metric_type': 'gauge',
            'value': float(total_cost),
        },
    )

    logger.info(f'Daily metrics computed for {yesterday}')
    return {'date': str(yesterday), 'metrics_computed': 6}


@shared_task
def compute_weekly_metrics():
    """Compute weekly dashboard metrics."""
    from analytics.models import DashboardMetric
    from pitches.models import Pitch

    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday() + 7)  # Previous Monday
    week_end = week_start + timedelta(days=6)

    logger.info(f'Computing weekly metrics for {week_start} to {week_end}')

    pitches = Pitch.objects.filter(
        created_at__date__gte=week_start,
        created_at__date__lte=week_end,
        is_active=True,
    )

    DashboardMetric.objects.update_or_create(
        name='weekly_pitches', period='weekly', date=week_start,
        defaults={
            'metric_type': 'counter',
            'value': pitches.count(),
            'metadata': {
                'week_start': str(week_start),
                'week_end': str(week_end),
            },
        },
    )

    DashboardMetric.objects.update_or_create(
        name='weekly_approvals', period='weekly', date=week_start,
        defaults={
            'metric_type': 'counter',
            'value': pitches.filter(status='approved').count(),
        },
    )

    logger.info(f'Weekly metrics computed for week of {week_start}')
    return {'week_start': str(week_start), 'metrics_computed': 2}


@shared_task
def compute_monthly_metrics():
    """Compute monthly dashboard metrics."""
    from agents.models import AgentExecution
    from analytics.models import DashboardMetric
    from campaigns.models import Campaign
    from customers.models import Customer
    from pitches.models import Pitch

    today = timezone.now().date()
    first_of_month = today.replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    logger.info(
        f'Computing monthly metrics for {last_month_start} to {last_month_end}'
    )

    # Monthly pitch stats
    pitches = Pitch.objects.filter(
        created_at__date__gte=last_month_start,
        created_at__date__lte=last_month_end,
        is_active=True,
    )
    DashboardMetric.objects.update_or_create(
        name='monthly_pitches', period='monthly', date=last_month_start,
        defaults={
            'metric_type': 'counter',
            'value': pitches.count(),
        },
    )

    # Monthly customer growth
    customers = Customer.objects.filter(
        created_at__date__gte=last_month_start,
        created_at__date__lte=last_month_end,
        is_active=True,
    )
    DashboardMetric.objects.update_or_create(
        name='monthly_new_customers', period='monthly', date=last_month_start,
        defaults={
            'metric_type': 'counter',
            'value': customers.count(),
        },
    )

    # Monthly total cost
    executions = AgentExecution.objects.filter(
        created_at__date__gte=last_month_start,
        created_at__date__lte=last_month_end,
    )
    total_cost = executions.aggregate(total=Sum('cost'))['total'] or 0
    DashboardMetric.objects.update_or_create(
        name='monthly_api_cost', period='monthly', date=last_month_start,
        defaults={
            'metric_type': 'gauge',
            'value': float(total_cost),
        },
    )

    logger.info(f'Monthly metrics computed for {last_month_start}')
    return {'month_start': str(last_month_start), 'metrics_computed': 3}


@shared_task
def compute_agent_performance():
    """Compute agent performance metrics for each agent."""
    from agents.models import AgentConfig, AgentExecution
    from analytics.models import AgentPerformance

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    logger.info(f'Computing agent performance for {yesterday}')

    agent_configs = AgentConfig.objects.filter(is_active=True)

    for agent_config in agent_configs:
        executions = AgentExecution.objects.filter(
            agent_config=agent_config,
            created_at__date=yesterday,
        )

        total = executions.count()
        if total == 0:
            continue

        successful = executions.filter(status='completed').count()
        avg_tokens = executions.filter(
            status='completed'
        ).aggregate(avg=Avg('tokens_used'))['avg'] or 0

        # Compute average duration for completed executions
        completed = executions.filter(
            status='completed',
            started_at__isnull=False,
            completed_at__isnull=False,
        )
        durations = [
            (e.completed_at - e.started_at).total_seconds()
            for e in completed
        ]
        avg_duration = sum(durations) / len(durations) if durations else 0

        AgentPerformance.objects.update_or_create(
            agent_config=agent_config,
            period='daily',
            date=yesterday,
            defaults={
                'total_executions': total,
                'successful_executions': successful,
                'avg_tokens': int(avg_tokens),
                'avg_duration': round(avg_duration, 2),
                'avg_quality_score': 0.0,  # Computed separately if needed
            },
        )

    logger.info(f'Agent performance computed for {yesterday}')
    return {'date': str(yesterday), 'agents_processed': agent_configs.count()}
