"""
Customer URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, CustomerInteractionViewSet

router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')
router.register(r'interactions', CustomerInteractionViewSet, basename='customer-interaction')

urlpatterns = [
    path('', include(router.urls)),
]
