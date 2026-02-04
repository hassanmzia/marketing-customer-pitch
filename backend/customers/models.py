"""
Customer models for AI Marketing Customer Pitch Assistant.
"""
from django.db import models

from core.models import BaseModel


class Customer(BaseModel):
    """
    Represents a customer or prospect in the marketing pipeline.
    """

    class CompanySize(models.TextChoices):
        STARTUP = 'startup', 'Startup'
        SMB = 'smb', 'Small & Medium Business'
        MID_MARKET = 'mid-market', 'Mid-Market'
        ENTERPRISE = 'enterprise', 'Enterprise'

    class Status(models.TextChoices):
        PROSPECT = 'prospect', 'Prospect'
        LEAD = 'lead', 'Lead'
        QUALIFIED = 'qualified', 'Qualified'
        CUSTOMER = 'customer', 'Customer'
        CHURNED = 'churned', 'Churned'

    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    industry = models.CharField(max_length=100, db_index=True)
    company_size = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        default=CompanySize.SMB,
        db_index=True,
    )
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    website = models.URLField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    preferences = models.JSONField(default=dict, blank=True)
    interaction_history = models.JSONField(default=list, blank=True)
    customer_360_data = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True, help_text='List of string tags')
    lead_score = models.IntegerField(
        default=0,
        help_text='Lead score from 0 to 100',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROSPECT,
        db_index=True,
    )

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'

    def __str__(self):
        return f'{self.name} ({self.company})'


class CustomerInteraction(BaseModel):
    """
    Records an interaction with a customer.
    """

    class InteractionType(models.TextChoices):
        EMAIL = 'email', 'Email'
        CALL = 'call', 'Call'
        MEETING = 'meeting', 'Meeting'
        DEMO = 'demo', 'Demo'
        PITCH = 'pitch', 'Pitch'

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='interactions',
    )
    interaction_type = models.CharField(
        max_length=20,
        choices=InteractionType.choices,
    )
    summary = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    sentiment_score = models.FloatField(
        default=0.0,
        help_text='Sentiment score from -1.0 (negative) to 1.0 (positive)',
    )
    created_by = models.CharField(max_length=255, blank=True, default='')

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Customer Interaction'
        verbose_name_plural = 'Customer Interactions'

    def __str__(self):
        return f'{self.interaction_type} with {self.customer.name} on {self.created_at}'
