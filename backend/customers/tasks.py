"""
Customer Celery tasks.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def enrich_customer_data(self, customer_id):
    """
    Asynchronously enrich customer data using AI agent research.

    This task gathers additional information about the customer from
    available sources and updates the customer_360_data field.
    """
    try:
        from customers.models import Customer

        customer = Customer.objects.get(id=customer_id)
        logger.info(f'Enriching data for customer: {customer.name}')

        # Build enrichment data from existing information
        enrichment = {
            'company_profile': {
                'name': customer.company,
                'industry': customer.industry,
                'size': customer.company_size,
                'website': customer.website,
            },
            'contact_info': {
                'primary_contact': customer.name,
                'email': customer.email,
                'phone': customer.phone,
            },
            'engagement_summary': {
                'total_interactions': customer.interactions.count(),
                'last_interaction': None,
                'sentiment_trend': 'neutral',
            },
            'enrichment_source': 'internal',
            'enrichment_complete': True,
        }

        # Get last interaction
        last_interaction = customer.interactions.order_by('-created_at').first()
        if last_interaction:
            enrichment['engagement_summary']['last_interaction'] = (
                last_interaction.created_at.isoformat()
            )

        # Try to use agent service for deeper enrichment
        try:
            from agents.services import AgentService
            agent_service = AgentService()
            agent_enrichment = agent_service.research_customer(customer_id)
            if agent_enrichment:
                enrichment['ai_research'] = agent_enrichment
                enrichment['enrichment_source'] = 'ai_agent'
        except Exception as agent_err:
            logger.warning(
                f'Agent enrichment failed for {customer.name}: {agent_err}. '
                'Using basic enrichment.'
            )

        customer.customer_360_data = enrichment
        customer.save(update_fields=['customer_360_data', 'updated_at'])
        logger.info(f'Successfully enriched data for customer: {customer.name}')
        return {'status': 'success', 'customer_id': customer_id}

    except Exception as exc:
        logger.error(f'Error enriching customer {customer_id}: {exc}')
        raise self.retry(exc=exc, countdown=60)
