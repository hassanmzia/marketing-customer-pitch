"""
Analytics serializers.
"""
from rest_framework import serializers

from .models import AgentPerformance, DashboardMetric, PitchAnalytics


class PitchAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for pitch analytics."""
    pitch_title = serializers.CharField(source='pitch.title', read_only=True)

    class Meta:
        model = PitchAnalytics
        fields = [
            'id', 'pitch', 'pitch_title', 'views_count', 'shares_count',
            'open_rate', 'response_rate', 'conversion', 'time_to_response',
            'a_b_test_group', 'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardMetricSerializer(serializers.ModelSerializer):
    """Serializer for dashboard metrics."""

    class Meta:
        model = DashboardMetric
        fields = [
            'id', 'name', 'metric_type', 'value', 'period', 'date',
            'metadata', 'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AgentPerformanceSerializer(serializers.ModelSerializer):
    """Serializer for agent performance metrics."""
    agent_name = serializers.CharField(source='agent_config.name', read_only=True)
    agent_type = serializers.CharField(source='agent_config.agent_type', read_only=True)
    success_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = AgentPerformance
        fields = [
            'id', 'agent_config', 'agent_name', 'agent_type',
            'period', 'date', 'total_executions', 'successful_executions',
            'success_rate', 'avg_tokens', 'avg_duration', 'avg_quality_score',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
