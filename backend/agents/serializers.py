"""
Agent serializers.
"""
from rest_framework import serializers

from .models import AgentConfig, AgentExecution, A2AMessage


class AgentConfigSerializer(serializers.ModelSerializer):
    """Serializer for agent configurations."""
    execution_count = serializers.SerializerMethodField()

    class Meta:
        model = AgentConfig
        fields = [
            'id', 'name', 'agent_type', 'description', 'system_prompt',
            'model_name', 'temperature', 'max_tokens', 'tools',
            'is_active', 'metadata', 'execution_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_execution_count(self, obj):
        return obj.executions.count()


class AgentExecutionSerializer(serializers.ModelSerializer):
    """Serializer for agent executions."""
    agent_name = serializers.CharField(source='agent_config.name', read_only=True)
    agent_type = serializers.CharField(source='agent_config.agent_type', read_only=True)
    duration = serializers.FloatField(read_only=True)

    class Meta:
        model = AgentExecution
        fields = [
            'id', 'agent_config', 'agent_name', 'agent_type',
            'input_data', 'output_data', 'status',
            'started_at', 'completed_at', 'duration',
            'tokens_used', 'cost', 'error_message',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'started_at',
            'completed_at', 'tokens_used', 'cost',
        ]


class A2AMessageSerializer(serializers.ModelSerializer):
    """Serializer for A2A messages."""
    from_agent_name = serializers.CharField(source='from_agent.name', read_only=True)
    to_agent_name = serializers.CharField(source='to_agent.name', read_only=True)
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = A2AMessage
        fields = [
            'id', 'from_agent', 'from_agent_name', 'to_agent', 'to_agent_name',
            'message_type', 'payload', 'correlation_id', 'status',
            'parent_message', 'reply_count',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'correlation_id']

    def get_reply_count(self, obj):
        return obj.replies.count()


class OrchestrateSerializer(serializers.Serializer):
    """Serializer for orchestrate pitch request."""
    customer_id = serializers.UUIDField()
    campaign_id = serializers.UUIDField(required=False)
    tone = serializers.CharField(default='professional')
    additional_context = serializers.CharField(required=False, default='')


class ExecuteAgentSerializer(serializers.Serializer):
    """Serializer for executing a specific agent."""
    input_data = serializers.DictField()
