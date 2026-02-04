"""
Pitch serializers.
"""
from rest_framework import serializers

from .models import Pitch, PitchScore, PitchTemplate


class PitchScoreSerializer(serializers.ModelSerializer):
    """Serializer for individual pitch scores."""

    class Meta:
        model = PitchScore
        fields = [
            'id', 'pitch', 'dimension', 'score', 'explanation',
            'scored_by', 'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PitchSerializer(serializers.ModelSerializer):
    """Serializer for Pitch list and create operations."""
    average_score = serializers.FloatField(read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Pitch
        fields = [
            'id', 'customer', 'customer_name', 'title', 'content',
            'pitch_type', 'version', 'status', 'scores', 'feedback',
            'parent_pitch', 'campaign', 'metadata', 'generated_by',
            'tone', 'language', 'average_score',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'version']


class PitchDetailSerializer(PitchSerializer):
    """Serializer for Pitch detail with scores and version history."""
    pitch_scores = PitchScoreSerializer(many=True, read_only=True)
    revision_count = serializers.SerializerMethodField()

    class Meta(PitchSerializer.Meta):
        fields = PitchSerializer.Meta.fields + ['pitch_scores', 'revision_count']

    def get_revision_count(self, obj):
        return obj.revisions.count()


class PitchTemplateSerializer(serializers.ModelSerializer):
    """Serializer for pitch templates."""

    class Meta:
        model = PitchTemplate
        fields = [
            'id', 'name', 'description', 'template_content', 'industry',
            'pitch_type', 'variables', 'usage_count',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class PitchGenerateSerializer(serializers.Serializer):
    """Serializer for pitch generation request."""
    customer_id = serializers.UUIDField()
    tone = serializers.ChoiceField(
        choices=Pitch.Tone.choices,
        default=Pitch.Tone.PROFESSIONAL,
    )
    pitch_type = serializers.ChoiceField(
        choices=Pitch.PitchType.choices,
        default=Pitch.PitchType.INITIAL,
    )
    template_id = serializers.UUIDField(required=False)
    campaign_id = serializers.UUIDField(required=False)
    additional_context = serializers.CharField(required=False, default='')


class PitchRefineSerializer(serializers.Serializer):
    """Serializer for pitch refinement request."""
    feedback = serializers.CharField()
    tone = serializers.ChoiceField(
        choices=Pitch.Tone.choices,
        required=False,
    )


class PitchCompareSerializer(serializers.Serializer):
    """Serializer for pitch comparison request."""
    pitch_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=2,
        max_length=5,
    )
