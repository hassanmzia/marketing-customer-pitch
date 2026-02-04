"""
Pitch models for AI Marketing Customer Pitch Assistant.
"""
from django.db import models

from core.models import BaseModel


class Pitch(BaseModel):
    """
    A marketing pitch generated for a customer.
    Supports versioning via parent_pitch self-referential FK.
    """

    class PitchType(models.TextChoices):
        INITIAL = 'initial', 'Initial'
        FOLLOW_UP = 'follow_up', 'Follow-up'
        PRODUCT_DEMO = 'product_demo', 'Product Demo'
        RENEWAL = 'renewal', 'Renewal'
        REFINED = 'refined', 'Refined'
        FINAL = 'final', 'Final'
        AB_VARIANT = 'ab_variant', 'A/B Variant'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        GENERATED = 'generated', 'Generated'
        SCORED = 'scored', 'Scored'
        REFINED = 'refined', 'Refined'
        APPROVED = 'approved', 'Approved'
        SENT = 'sent', 'Sent'

    class Tone(models.TextChoices):
        PROFESSIONAL = 'professional', 'Professional'
        CASUAL = 'casual', 'Casual'
        FRIENDLY = 'friendly', 'Friendly'
        URGENT = 'urgent', 'Urgent'
        CONSULTATIVE = 'consultative', 'Consultative'

    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='pitches',
    )
    title = models.CharField(max_length=500)
    content = models.TextField()
    pitch_type = models.CharField(
        max_length=20,
        choices=PitchType.choices,
        default=PitchType.INITIAL,
    )
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    scores = models.JSONField(
        default=dict,
        blank=True,
        help_text='Scores: persuasiveness, clarity, relevance (0-1)',
    )
    feedback = models.TextField(blank=True, default='')
    parent_pitch = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisions',
    )
    campaign = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pitches',
    )
    metadata = models.JSONField(default=dict, blank=True)
    generated_by = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Name of the agent that generated this pitch',
    )
    tone = models.CharField(
        max_length=20,
        choices=Tone.choices,
        default=Tone.PROFESSIONAL,
    )
    language = models.CharField(max_length=10, default='en')

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Pitch'
        verbose_name_plural = 'Pitches'

    def __str__(self):
        return f'{self.title} (v{self.version}) - {self.status}'

    @property
    def average_score(self):
        """Calculate the average of all score dimensions."""
        if not self.scores:
            return None
        values = [v for v in self.scores.values() if isinstance(v, (int, float))]
        return sum(values) / len(values) if values else None


class PitchTemplate(BaseModel):
    """
    Reusable pitch templates for different industries and pitch types.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    template_content = models.TextField()
    industry = models.CharField(max_length=100, blank=True, default='')
    pitch_type = models.CharField(
        max_length=20,
        choices=Pitch.PitchType.choices,
        default=Pitch.PitchType.INITIAL,
    )
    variables = models.JSONField(
        default=list,
        blank=True,
        help_text='List of template variables',
    )
    usage_count = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        ordering = ['-usage_count']
        verbose_name = 'Pitch Template'
        verbose_name_plural = 'Pitch Templates'

    def __str__(self):
        return self.name


class PitchScore(BaseModel):
    """
    Individual scoring dimensions for a pitch.
    """
    pitch = models.ForeignKey(
        Pitch,
        on_delete=models.CASCADE,
        related_name='pitch_scores',
    )
    dimension = models.CharField(
        max_length=50,
        help_text='Scoring dimension (e.g., persuasiveness, clarity, relevance)',
    )
    score = models.FloatField(help_text='Score from 0.0 to 1.0')
    explanation = models.TextField(blank=True, default='')
    scored_by = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Agent name that performed scoring',
    )

    class Meta(BaseModel.Meta):
        ordering = ['-created_at']
        verbose_name = 'Pitch Score'
        verbose_name_plural = 'Pitch Scores'
        unique_together = ['pitch', 'dimension', 'scored_by']

    def __str__(self):
        return f'{self.pitch.title} - {self.dimension}: {self.score}'
