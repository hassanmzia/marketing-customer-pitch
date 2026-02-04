"""
Agent URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AgentConfigViewSet,
    AgentExecutionViewSet,
    A2AMessageViewSet,
    orchestrate_pitch,
)

router = DefaultRouter()
router.register(r'configs', AgentConfigViewSet, basename='agent-config')
router.register(r'executions', AgentExecutionViewSet, basename='agent-execution')
router.register(r'messages', A2AMessageViewSet, basename='a2a-message')

urlpatterns = [
    path('', include(router.urls)),
    path('orchestrate/', orchestrate_pitch, name='orchestrate-pitch'),
]
