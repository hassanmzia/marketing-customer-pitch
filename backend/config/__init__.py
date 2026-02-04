"""
Config package for the AI Marketing Customer Pitch Assistant.
"""
from .celery import app as celery_app

__all__ = ('celery_app',)
