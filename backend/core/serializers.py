"""
Core serializers.
"""
from rest_framework import serializers


class BaseModelSerializer(serializers.ModelSerializer):
    """Base serializer that includes common BaseModel fields."""

    class Meta:
        fields = ['id', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']
