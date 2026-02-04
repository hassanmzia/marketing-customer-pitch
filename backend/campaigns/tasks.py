"""
Campaign Celery tasks.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def execute_campaign(self, campaign_id):
    """
    Execute a campaign by generating pitches for all pending targets.
    """
    try:
        from campaigns.models import Campaign, CampaignTarget
        from pitches.tasks import async_generate_pitch

        campaign = Campaign.objects.get(id=campaign_id)
        logger.info(f'Executing campaign: {campaign.name}')

        if campaign.status != 'active':
            logger.warning(
                f'Campaign {campaign.name} is not active (status: {campaign.status}). '
                'Skipping execution.'
            )
            return {'status': 'skipped', 'reason': 'Campaign not active'}

        pending_targets = campaign.targets.filter(status='pending')
        launched = 0

        for target in pending_targets:
            # Check if campaign was paused during execution
            campaign.refresh_from_db()
            if campaign.status != 'active':
                logger.info(f'Campaign {campaign.name} paused. Stopping execution.')
                break

            # Trigger pitch generation for this target
            async_generate_pitch.delay(
                customer_id=str(target.customer_id),
                tone='professional',
                pitch_type='initial',
                campaign_id=str(campaign.id),
            )

            target.status = 'pitched'
            from django.utils import timezone
            target.pitched_at = timezone.now()
            target.save(update_fields=['status', 'pitched_at', 'updated_at'])
            launched += 1

        logger.info(
            f'Campaign {campaign.name}: launched {launched} pitches '
            f'out of {pending_targets.count()} pending targets.'
        )

        return {
            'status': 'success',
            'campaign_id': campaign_id,
            'pitches_launched': launched,
        }

    except Exception as exc:
        logger.error(f'Error executing campaign {campaign_id}: {exc}')
        raise self.retry(exc=exc, countdown=60)


@shared_task
def update_campaign_metrics(campaign_id):
    """
    Update campaign metrics based on current target statuses.
    """
    try:
        from campaigns.models import Campaign

        campaign = Campaign.objects.get(id=campaign_id)
        targets = campaign.targets.all()
        total = targets.count()

        if total == 0:
            return {'status': 'no_targets'}

        metrics = {
            'total_targets': total,
            'pitched': targets.filter(status='pitched').count(),
            'responded': targets.filter(status='responded').count(),
            'converted': targets.filter(status='converted').count(),
            'rejected': targets.filter(status='rejected').count(),
        }
        metrics['open_rate'] = metrics['pitched'] / total
        metrics['response_rate'] = metrics['responded'] / total
        metrics['conversion_rate'] = metrics['converted'] / total

        campaign.metrics = metrics
        campaign.save(update_fields=['metrics', 'updated_at'])

        # Complete campaign if all targets are processed
        pending = targets.filter(status='pending').count()
        if pending == 0 and campaign.status == 'active':
            campaign.status = 'completed'
            from django.utils import timezone
            campaign.end_date = timezone.now()
            campaign.save(update_fields=['status', 'end_date', 'updated_at'])

        return {'status': 'success', 'metrics': metrics}

    except Exception as exc:
        logger.error(f'Error updating campaign metrics {campaign_id}: {exc}')
        return {'status': 'error', 'error': str(exc)}
