"""
Campaign admin configuration.
"""
from django.contrib import admin

from .models import Campaign, CampaignTarget


class CampaignTargetInline(admin.TabularInline):
    model = CampaignTarget
    extra = 0
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['customer']


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'status', 'campaign_type', 'target_industry',
        'target_company_size', 'budget', 'start_date', 'end_date',
        'is_active', 'created_at',
    ]
    list_filter = ['status', 'campaign_type', 'target_industry', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [CampaignTargetInline]
    ordering = ['-created_at']


@admin.register(CampaignTarget)
class CampaignTargetAdmin(admin.ModelAdmin):
    list_display = [
        'campaign', 'customer', 'status', 'pitched_at', 'responded_at', 'created_at',
    ]
    list_filter = ['status', 'campaign']
    search_fields = ['customer__name', 'campaign__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['campaign', 'customer']
    ordering = ['-created_at']
