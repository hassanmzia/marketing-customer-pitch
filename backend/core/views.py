"""
Core views: health check and system status.
"""
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Basic health check endpoint."""
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'AI Marketing Customer Pitch Assistant',
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """Detailed system status including database and cache connectivity."""
    result = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'components': {},
    }

    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        result['components']['database'] = {'status': 'up'}
    except Exception as e:
        result['components']['database'] = {'status': 'down', 'error': str(e)}
        result['status'] = 'degraded'

    # Check cache
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', timeout=10)
        value = cache.get('health_check')
        if value == 'ok':
            result['components']['cache'] = {'status': 'up'}
        else:
            result['components']['cache'] = {'status': 'degraded'}
            result['status'] = 'degraded'
    except Exception as e:
        result['components']['cache'] = {'status': 'down', 'error': str(e)}
        result['status'] = 'degraded'

    # Check Celery
    try:
        from config.celery import app as celery_app
        inspector = celery_app.control.inspect()
        active = inspector.active()
        if active is not None:
            result['components']['celery'] = {'status': 'up', 'workers': len(active)}
        else:
            result['components']['celery'] = {'status': 'down', 'workers': 0}
            result['status'] = 'degraded'
    except Exception as e:
        result['components']['celery'] = {'status': 'down', 'error': str(e)}
        result['status'] = 'degraded'

    http_status = (
        status.HTTP_200_OK if result['status'] == 'healthy'
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return Response(result, status=http_status)
