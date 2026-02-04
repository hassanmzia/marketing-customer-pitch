"""
Pitch Celery tasks for async generation, scoring, and refinement.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def async_generate_pitch(
    self, customer_id, tone='professional', pitch_type='initial',
    template_id=None, campaign_id=None, additional_context='',
):
    """
    Asynchronously generate a pitch for a customer using the AI agent.
    """
    try:
        from agents.services import AgentService
        from customers.models import Customer
        from pitches.models import Pitch, PitchTemplate

        customer = Customer.objects.get(id=customer_id)
        logger.info(f'Generating pitch for customer: {customer.name}')

        agent_service = AgentService()

        # Build context
        context = {
            'customer_name': customer.name,
            'company': customer.company,
            'industry': customer.industry,
            'company_size': customer.company_size,
            'description': customer.description,
            'preferences': customer.preferences,
            'tone': tone,
            'additional_context': additional_context,
        }

        # Add template if provided
        if template_id:
            try:
                template = PitchTemplate.objects.get(id=template_id)
                context['template'] = template.template_content
                context['template_variables'] = template.variables
                template.usage_count += 1
                template.save(update_fields=['usage_count'])
            except PitchTemplate.DoesNotExist:
                logger.warning(f'Template {template_id} not found, proceeding without.')

        # Generate pitch content
        result = agent_service.generate_pitch(customer_id, context)

        # Create pitch record
        pitch = Pitch.objects.create(
            customer=customer,
            title=result.get('title', f'Pitch for {customer.company}'),
            content=result.get('content', ''),
            pitch_type=pitch_type,
            status='generated',
            tone=tone,
            generated_by='pitch_generator_agent',
            metadata=result.get('metadata', {}),
            campaign_id=campaign_id,
        )

        logger.info(f'Pitch generated successfully: {pitch.id}')
        return {
            'status': 'success',
            'pitch_id': str(pitch.id),
            'title': pitch.title,
        }

    except Exception as exc:
        logger.error(f'Error generating pitch for customer {customer_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=3)
def async_score_pitch(self, pitch_id):
    """
    Asynchronously score a pitch using the AI scorer agent.
    """
    try:
        from agents.services import AgentService
        from pitches.models import Pitch, PitchScore

        pitch = Pitch.objects.get(id=pitch_id)
        logger.info(f'Scoring pitch: {pitch.title}')

        agent_service = AgentService()
        scores = agent_service.score_pitch(pitch_id)

        # Save individual scores
        for dimension, data in scores.items():
            PitchScore.objects.update_or_create(
                pitch=pitch,
                dimension=dimension,
                scored_by='scorer_agent',
                defaults={
                    'score': data.get('score', 0.0),
                    'explanation': data.get('explanation', ''),
                },
            )

        # Update aggregate scores on pitch
        pitch.scores = {
            dim: data.get('score', 0.0)
            for dim, data in scores.items()
        }
        pitch.status = 'scored'
        pitch.save(update_fields=['scores', 'status', 'updated_at'])

        logger.info(f'Pitch scored successfully: {pitch.id}')
        return {
            'status': 'success',
            'pitch_id': str(pitch.id),
            'scores': pitch.scores,
        }

    except Exception as exc:
        logger.error(f'Error scoring pitch {pitch_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=3)
def async_refine_pitch(self, pitch_id, feedback, tone=None):
    """
    Asynchronously refine a pitch based on feedback.
    """
    try:
        from agents.services import AgentService
        from pitches.models import Pitch

        pitch = Pitch.objects.get(id=pitch_id)
        logger.info(f'Refining pitch: {pitch.title}')

        agent_service = AgentService()
        result = agent_service.refine_pitch(pitch_id, feedback)

        # Create a new version of the pitch
        refined_pitch = Pitch.objects.create(
            customer=pitch.customer,
            title=result.get('title', pitch.title),
            content=result.get('content', ''),
            pitch_type='refined',
            version=pitch.version + 1,
            status='refined',
            tone=tone or pitch.tone,
            generated_by='refiner_agent',
            parent_pitch=pitch,
            campaign=pitch.campaign,
            feedback=feedback,
            metadata={
                'refinement_feedback': feedback,
                'parent_version': pitch.version,
                **result.get('metadata', {}),
            },
        )

        logger.info(f'Pitch refined successfully: {refined_pitch.id}')
        return {
            'status': 'success',
            'original_pitch_id': str(pitch.id),
            'refined_pitch_id': str(refined_pitch.id),
            'version': refined_pitch.version,
        }

    except Exception as exc:
        logger.error(f'Error refining pitch {pitch_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)
