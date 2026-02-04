"""
Analytics models for AI Marketing Customer Pitch Assistant.
"""
from django.db import models

from core.models import BaseModel


class PitchAnalytics(BaseModel):
    """
    Analytics data for a specific pitch.
    """
    pitch = models.OneToOneField(
        'pitches.Pitch',
        on_delete=models.CASCADE,
        related_name='analytics',
    )
    views_count = models.IntegerField(default=0)
    shares_count = models.IntegerField(default=0)
    open_rate = models.FloatField(
        default=0.0,
        help_text='Open rate as decimal (0.0 to 1.0)',
    )
    response_rate = models.FloatField(
        default=0.0,
        help_text='Response rate as decimal (0.0 to 1.0)',
    )
    conversion = models.BooleanField(default=False)
    time_to_response = models.DurationField(
        null=True,
        blank=True,
        help_text='Time from pitch sent to first response',
    )
    a_b_test_group = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='A/B test group identifier',
    )

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Pitch Analytics'
        verbose_name_plural = 'Pitch Analytics'

    def __str__(self):
        return f'Analytics for {self.pitch.title}'


class DashboardMetric(BaseModel):
    """
    Aggregated dashboard metrics for the application.
    """

    class MetricType(models.TextChoices):
        COUNTER = 'counter', 'Counter'
        GAUGE = 'gauge', 'Gauge'
        PERCENTAGE = 'percentage', 'Percentage'
        TREND = 'trend', 'Trend'

    class Period(models.TextChoices):
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    name = models.CharField(max_length=255, db_index=True)
    metric_type = models.CharField(
        max_length=20,
        choices=MetricType.choices,
    )
    value = models.FloatField(default=0.0)
    period = models.CharField(
        max_length=20,
        choices=Period.choices,
    )
    date = models.DateField(db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ['-date', 'name']
        verbose_name = 'Dashboard Metric'
        verbose_name_plural = 'Dashboard Metrics'
        unique_together = ['name', 'period', 'date']

    def __str__(self):
        return f'{self.name}: {self.value} ({self.period} - {self.date})'


class AgentPerformance(BaseModel):
    """
    Performance metrics for an AI agent over a specific period.
    """
    agent_config = models.ForeignKey(
        'agents.AgentConfig',
        on_delete=models.CASCADE,
        related_name='performance_metrics',
    )
    period = models.CharField(
        max_length=20,
        choices=DashboardMetric.Period.choices,
    )
    date = models.DateField(db_index=True)
    total_executions = models.IntegerField(default=0)
    successful_executions = models.IntegerField(default=0)
    avg_tokens = models.IntegerField(default=0)
    avg_duration = models.FloatField(
        default=0.0,
        help_text='Average execution duration in seconds',
    )
    avg_quality_score = models.FloatField(
        default=0.0,
        help_text='Average quality score (0.0 to 1.0)',
    )

    class Meta(BaseModel.Meta):
        ordering = ['-date']
        verbose_name = 'Agent Performance'
        verbose_name_plural = 'Agent Performance'
        unique_together = ['agent_config', 'period', 'date']

    def __str__(self):
        return f'{self.agent_config.name} - {self.period} ({self.date})'

    @property
    def success_rate(self):
        if self.total_executions == 0:
            return 0.0
        return self.successful_executions / self.total_executions
