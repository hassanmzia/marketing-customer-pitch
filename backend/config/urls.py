"""
URL configuration for AI Marketing Customer Pitch Assistant.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health_check(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    path('api/v1/', include('core.urls')),
    path('api/v1/customers/', include('customers.urls')),
    path('api/v1/pitches/', include('pitches.urls')),
    path('api/v1/campaigns/', include('campaigns.urls')),
    path('api/v1/agents/', include('agents.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
]
