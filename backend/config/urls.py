"""
URL configuration for AI Marketing Customer Pitch Assistant.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('core.urls')),
    path('api/v1/customers/', include('customers.urls')),
    path('api/v1/pitches/', include('pitches.urls')),
    path('api/v1/campaigns/', include('campaigns.urls')),
    path('api/v1/agents/', include('agents.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
]
