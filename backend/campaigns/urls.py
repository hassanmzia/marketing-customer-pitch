"""
Campaign URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CampaignViewSet, CampaignTargetViewSet

router = DefaultRouter()
router.register(r'', CampaignViewSet, basename='campaign')
router.register(r'targets', CampaignTargetViewSet, basename='campaign-target')

urlpatterns = [
    path('', include(router.urls)),
]
