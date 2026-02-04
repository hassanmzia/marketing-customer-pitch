"""
Analytics admin configuration.
"""
from django.contrib import admin

from .models import AgentPerformance, DashboardMetric, PitchAnalytics


@admin.register(PitchAnalytics)
class PitchAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'pitch', 'views_count', 'shares_count', 'open_rate',
        'response_rate', 'conversion', 'a_b_test_group', 'created_at',
    ]
    list_filter = ['conversion', 'a_b_test_group', 'is_active']
    search_fields = ['pitch__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['pitch']
    ordering = ['-created_at']


@admin.register(DashboardMetric)
class DashboardMetricAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'metric_type', 'value', 'period', 'date', 'created_at',
    ]
    list_filter = ['metric_type', 'period', 'date']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-date', 'name']


@admin.register(AgentPerformance)
class AgentPerformanceAdmin(admin.ModelAdmin):
    list_display = [
        'agent_config', 'period', 'date', 'total_executions',
        'successful_executions', 'avg_tokens', 'avg_duration',
        'avg_quality_score', 'created_at',
    ]
    list_filter = ['period', 'date', 'agent_config']
    search_fields = ['agent_config__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['agent_config']
    ordering = ['-date']
