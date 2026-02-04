"""
Core Celery tasks.
"""
from celery import shared_task


@shared_task
def cleanup_inactive_records():
    """Periodic task to clean up old inactive records."""
    # TODO: Implement cleanup logic for soft-deleted records
    pass
