"""
Core models for AI Marketing Customer Pitch Assistant.

Provides the abstract BaseModel that all other models inherit from.
"""
import uuid

from django.db import models


class BaseModel(models.Model):
    """
    Abstract base model providing common fields for all models.

    Fields:
        id: UUID primary key.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
        is_active: Soft-delete / active flag.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def __str__(self):
        return str(self.id)
