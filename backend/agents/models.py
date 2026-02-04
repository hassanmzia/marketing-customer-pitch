"""
Agent models for AI Marketing Customer Pitch Assistant.

Defines agent configurations, execution logs, and A2A messaging.
"""
import uuid

from django.db import models

from core.models import BaseModel


class AgentConfig(BaseModel):
    """
    Configuration for an AI agent in the multi-agent system.
    """

    class AgentType(models.TextChoices):
        RESEARCH = 'research', 'Research Agent'
        PITCH_GENERATOR = 'pitch_generator', 'Pitch Generator Agent'
        SCORER = 'scorer', 'Scorer Agent'
        REFINER = 'refiner', 'Refiner Agent'
        STRATEGY = 'strategy', 'Strategy Agent'
        ORCHESTRATOR = 'orchestrator', 'Orchestrator Agent'

    name = models.CharField(max_length=255, unique=True)
    agent_type = models.CharField(
        max_length=30,
        choices=AgentType.choices,
        db_index=True,
    )
    description = models.TextField(blank=True, default='')
    system_prompt = models.TextField(blank=True, default='')
    model_name = models.CharField(max_length=100, default='gpt-4o')
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=4096)
    tools = models.JSONField(
        default=list,
        blank=True,
        help_text='List of tool configurations for this agent',
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ['name']
        verbose_name = 'Agent Configuration'
        verbose_name_plural = 'Agent Configurations'

    def __str__(self):
        return f'{self.name} ({self.get_agent_type_display()})'


class AgentExecution(BaseModel):
    """
    Logs a single execution of an AI agent.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    agent_config = models.ForeignKey(
        AgentConfig,
        on_delete=models.CASCADE,
        related_name='executions',
    )
    input_data = models.JSONField(default=dict)
    output_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    tokens_used = models.IntegerField(default=0)
    cost = models.DecimalField(max_digits=10, decimal_places=6, default=0.000000)
    error_message = models.TextField(blank=True, default='')

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Agent Execution'
        verbose_name_plural = 'Agent Executions'

    def __str__(self):
        return f'{self.agent_config.name} - {self.status} ({self.created_at})'

    @property
    def duration(self):
        """Calculate execution duration in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class A2AMessage(BaseModel):
    """
    Agent-to-Agent (A2A) message for inter-agent communication.
    """

    class MessageType(models.TextChoices):
        REQUEST = 'request', 'Request'
        RESPONSE = 'response', 'Response'
        BROADCAST = 'broadcast', 'Broadcast'
        DELEGATE = 'delegate', 'Delegate'

    class Status(models.TextChoices):
        SENT = 'sent', 'Sent'
        RECEIVED = 'received', 'Received'
        PROCESSED = 'processed', 'Processed'
        FAILED = 'failed', 'Failed'

    from_agent = models.ForeignKey(
        AgentConfig,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    to_agent = models.ForeignKey(
        AgentConfig,
        on_delete=models.CASCADE,
        related_name='received_messages',
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
    )
    payload = models.JSONField(default=dict)
    correlation_id = models.UUIDField(
        default=uuid.uuid4,
        db_index=True,
        help_text='Links related messages in a conversation',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
    )
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
    )

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'A2A Message'
        verbose_name_plural = 'A2A Messages'

    def __str__(self):
        return (
            f'{self.from_agent.name} -> {self.to_agent.name} '
            f'({self.message_type}) [{self.status}]'
        )
