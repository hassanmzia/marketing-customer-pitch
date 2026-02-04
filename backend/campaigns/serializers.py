"""
Campaign serializers.
"""
from rest_framework import serializers

from .models import Campaign, CampaignTarget


class CampaignTargetSerializer(serializers.ModelSerializer):
    """Serializer for campaign targets."""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_company = serializers.CharField(source='customer.company', read_only=True)

    class Meta:
        model = CampaignTarget
        fields = [
            'id', 'campaign', 'customer', 'customer_name', 'customer_company',
            'status', 'pitched_at', 'responded_at',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CampaignSerializer(serializers.ModelSerializer):
    """Serializer for Campaign list and create operations."""
    target_count = serializers.IntegerField(read_only=True)
    converted_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'description', 'status', 'campaign_type',
            'target_industry', 'target_company_size', 'start_date', 'end_date',
            'goals', 'budget', 'metrics', 'target_count', 'converted_count',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CampaignDetailSerializer(CampaignSerializer):
    """Serializer for Campaign detail with nested targets."""
    targets = CampaignTargetSerializer(many=True, read_only=True)

    class Meta(CampaignSerializer.Meta):
        fields = CampaignSerializer.Meta.fields + ['targets']


class AddTargetsSerializer(serializers.Serializer):
    """Serializer for adding targets to a campaign."""
    customer_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
    )
