"""
Campaign models for AI Marketing Customer Pitch Assistant.
"""
from django.db import models

from core.models import BaseModel


class Campaign(BaseModel):
    """
    A marketing campaign targeting specific customers/segments.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'
        ARCHIVED = 'archived', 'Archived'

    class CampaignType(models.TextChoices):
        EMAIL = 'email', 'Email'
        SOCIAL = 'social', 'Social'
        MULTI_CHANNEL = 'multi-channel', 'Multi-Channel'
        ABTEST = 'abtest', 'A/B Test'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    campaign_type = models.CharField(
        max_length=20,
        choices=CampaignType.choices,
        default=CampaignType.EMAIL,
    )
    target_industry = models.CharField(max_length=100, blank=True, default='')
    target_company_size = models.CharField(max_length=20, blank=True, default='')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    goals = models.JSONField(default=dict, blank=True)
    budget = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00,
    )
    metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text='Metrics: open_rate, response_rate, conversion_rate',
    )

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'

    def __str__(self):
        return f'{self.name} ({self.status})'

    @property
    def target_count(self):
        return self.targets.count()

    @property
    def converted_count(self):
        return self.targets.filter(status='converted').count()


class CampaignTarget(BaseModel):
    """
    Associates a customer with a campaign and tracks their status.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PITCHED = 'pitched', 'Pitched'
        RESPONDED = 'responded', 'Responded'
        CONVERTED = 'converted', 'Converted'
        REJECTED = 'rejected', 'Rejected'

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='targets',
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='campaign_targets',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    pitched_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Campaign Target'
        verbose_name_plural = 'Campaign Targets'
        unique_together = ['campaign', 'customer']

    def __str__(self):
        return f'{self.campaign.name} -> {self.customer.name} ({self.status})'
