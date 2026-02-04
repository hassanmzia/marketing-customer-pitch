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

# Explicit URL patterns for viewset actions to ensure they are always
# registered (DRF router @action auto-discovery can miss them if the
# module was cached before the action was added).
_pitch_detail = PitchViewSet.as_view({
    'get': 'export',
})
_pitch_history = PitchViewSet.as_view({
    'get': 'history',
})

urlpatterns = [
    path('templates/', include(template_router.urls)),
    path('scores/', include(score_router.urls)),
    # Explicit action routes before the router catch-all
    path('<uuid:pk>/export/', _pitch_detail, name='pitch-export'),
    path('<uuid:pk>/history/', _pitch_history, name='pitch-history'),
    path('', include(pitch_router.urls)),
]
