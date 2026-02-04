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

    def calculate_lead_score(self):
        """Calculate a lead score (0-100) based on profile completeness,
        status, company size, interactions, and pitch history."""
        score = 0

        # Profile completeness (up to 30 points)
        if self.name:
            score += 5
        if self.email:
            score += 5
        if self.company:
            score += 5
        if self.industry:
            score += 5
        if self.description:
            score += 5
        if self.website:
            score += 5

        # Company size (up to 15 points)
        size_scores = {
            'enterprise': 15,
            'mid-market': 12,
            'smb': 8,
            'startup': 5,
        }
        score += size_scores.get(self.company_size, 0)

        # Status progression (up to 20 points)
        status_scores = {
            'prospect': 5,
            'lead': 10,
            'qualified': 15,
            'customer': 20,
            'churned': 3,
        }
        score += status_scores.get(self.status, 0)

        # Interactions (up to 20 points)
        interaction_count = self.interactions.count() if self.pk else 0
        score += min(interaction_count * 4, 20)

        # Pitch history (up to 15 points)
        if self.pk:
            from pitches.models import Pitch
            pitch_count = Pitch.objects.filter(
                customer=self, is_active=True
            ).count()
            score += min(pitch_count * 5, 15)

        return min(score, 100)

    def save(self, **kwargs):
        self.lead_score = self.calculate_lead_score()
        super().save(**kwargs)


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
