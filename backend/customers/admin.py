"""
Customer admin configuration.
"""
from django.contrib import admin

from .models import Customer, CustomerInteraction


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'company', 'industry', 'company_size', 'status',
        'lead_score', 'email', 'is_active', 'created_at',
    ]
    list_filter = ['industry', 'company_size', 'status', 'is_active']
    search_fields = ['name', 'company', 'email', 'industry', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(CustomerInteraction)
class CustomerInteractionAdmin(admin.ModelAdmin):
    list_display = [
        'customer', 'interaction_type', 'summary', 'sentiment_score',
        'created_by', 'created_at',
    ]
    list_filter = ['interaction_type', 'created_at']
    search_fields = ['summary', 'customer__name', 'created_by']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
