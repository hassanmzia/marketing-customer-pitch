"""
Pitch admin configuration.
"""
from django.contrib import admin

from .models import Pitch, PitchScore, PitchTemplate


@admin.register(Pitch)
class PitchAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'customer', 'pitch_type', 'version', 'status',
        'tone', 'generated_by', 'is_active', 'created_at',
    ]
    list_filter = ['pitch_type', 'status', 'tone', 'is_active', 'generated_by']
    search_fields = ['title', 'content', 'customer__name', 'customer__company']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['customer', 'parent_pitch', 'campaign']
    ordering = ['-created_at']


@admin.register(PitchTemplate)
class PitchTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'industry', 'pitch_type', 'usage_count', 'is_active', 'created_at',
    ]
    list_filter = ['industry', 'pitch_type', 'is_active']
    search_fields = ['name', 'description', 'template_content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-usage_count']


@admin.register(PitchScore)
class PitchScoreAdmin(admin.ModelAdmin):
    list_display = [
        'pitch', 'dimension', 'score', 'scored_by', 'created_at',
    ]
    list_filter = ['dimension', 'scored_by']
    search_fields = ['pitch__title', 'dimension', 'explanation']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['pitch']
    ordering = ['-created_at']
