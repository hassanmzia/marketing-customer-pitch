"""
Pitch URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PitchViewSet, PitchTemplateViewSet, PitchScoreViewSet

router = DefaultRouter()
router.register(r'', PitchViewSet, basename='pitch')
router.register(r'templates', PitchTemplateViewSet, basename='pitch-template')
router.register(r'scores', PitchScoreViewSet, basename='pitch-score')

urlpatterns = [
    path('', include(router.urls)),
]
