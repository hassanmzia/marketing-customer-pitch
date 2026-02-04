"""
Pitch URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PitchViewSet, PitchTemplateViewSet, PitchScoreViewSet

template_router = DefaultRouter()
template_router.register(r'', PitchTemplateViewSet, basename='pitch-template')

score_router = DefaultRouter()
score_router.register(r'', PitchScoreViewSet, basename='pitch-score')

pitch_router = DefaultRouter()
pitch_router.register(r'', PitchViewSet, basename='pitch')

urlpatterns = [
    path('templates/', include(template_router.urls)),
    path('scores/', include(score_router.urls)),
    path('', include(pitch_router.urls)),
]
