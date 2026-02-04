"""
Customer serializers.
"""
from rest_framework import serializers

from .models import Customer, CustomerInteraction


class CustomerInteractionSerializer(serializers.ModelSerializer):
    """Serializer for customer interactions."""

    class Meta:
        model = CustomerInteraction
        fields = [
            'id', 'customer', 'interaction_type', 'summary', 'details',
            'sentiment_score', 'created_by', 'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer list and create operations."""
    interaction_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'company', 'industry', 'company_size', 'email',
            'phone', 'website', 'description', 'preferences',
            'interaction_history', 'customer_360_data', 'tags',
            'lead_score', 'status', 'interaction_count',
            'created_at', 'updated_at', 'is_active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_interaction_count(self, obj):
        return obj.interactions.count()


class CustomerDetailSerializer(CustomerSerializer):
    """Serializer for Customer detail with nested interactions."""
    interactions = CustomerInteractionSerializer(many=True, read_only=True)

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ['interactions']


class CustomerImportSerializer(serializers.Serializer):
    """Serializer for bulk customer import."""
    customers = CustomerSerializer(many=True)

    def create(self, validated_data):
        customers_data = validated_data.get('customers', [])
        created = []
        for data in customers_data:
            customer = Customer.objects.create(**data)
            created.append(customer)
        return created
