"""
Agent admin configuration.
"""
from django.contrib import admin

from .models import AgentConfig, AgentExecution, A2AMessage


@admin.register(AgentConfig)
class AgentConfigAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'agent_type', 'model_name', 'temperature',
        'max_tokens', 'is_active', 'created_at',
    ]
    list_filter = ['agent_type', 'model_name', 'is_active']
    search_fields = ['name', 'description', 'system_prompt']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(AgentExecution)
class AgentExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'agent_config', 'status', 'tokens_used', 'cost',
        'started_at', 'completed_at', 'created_at',
    ]
    list_filter = ['status', 'agent_config__agent_type', 'agent_config']
    search_fields = ['agent_config__name', 'error_message']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['agent_config']
    ordering = ['-created_at']


@admin.register(A2AMessage)
class A2AMessageAdmin(admin.ModelAdmin):
    list_display = [
        'from_agent', 'to_agent', 'message_type', 'status',
        'correlation_id', 'created_at',
    ]
    list_filter = ['message_type', 'status', 'from_agent', 'to_agent']
    search_fields = ['correlation_id', 'from_agent__name', 'to_agent__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['from_agent', 'to_agent', 'parent_message']
    ordering = ['-created_at']
