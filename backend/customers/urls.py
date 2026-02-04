"""
Customer URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, CustomerInteractionViewSet

router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')
router.register(r'interactions', CustomerInteractionViewSet, basename='customer-interaction')

# Explicit URL patterns for viewset actions to ensure they are always
# registered (DRF router @action auto-discovery can miss them if the
# module was cached before the action was added).
_customer_360 = CustomerViewSet.as_view({
    'get': 'customer_360',
})

urlpatterns = [
    # Explicit action routes before the router catch-all
    path('<uuid:pk>/customer-360/', _customer_360, name='customer-360'),
    path('', include(router.urls)),
]
