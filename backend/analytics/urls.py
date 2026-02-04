"""
Analytics URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AgentPerformanceViewSet,
    DashboardMetricViewSet,
    PitchAnalyticsViewSet,
    dashboard,
)

router = DefaultRouter()
router.register(r'pitch-analytics', PitchAnalyticsViewSet, basename='pitch-analytics')
router.register(r'agent-performance', AgentPerformanceViewSet, basename='agent-performance')
router.register(r'metrics', DashboardMetricViewSet, basename='dashboard-metric')

urlpatterns = [
    path('dashboard/', dashboard, name='analytics-dashboard'),
    path('', include(router.urls)),
]
