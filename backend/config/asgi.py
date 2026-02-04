"""
ASGI config for AI Marketing Customer Pitch Assistant.

Exposes the ASGI callable as a module-level variable named ``application``.
Supports HTTP and WebSocket protocols via Django Channels.
"""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure AppRegistry is populated
# before importing consumers.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    # TODO: Add WebSocket routing for real-time agent updates
    # 'websocket': AuthMiddlewareStack(
    #     URLRouter(
    #         websocket_urlpatterns
    #     )
    # ),
})
