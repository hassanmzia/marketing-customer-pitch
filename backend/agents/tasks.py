"""
Agent Celery tasks wrapping agent service methods.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def async_orchestrate_pipeline(self, customer_id, campaign_id=None):
    """
    Asynchronous orchestration of the full multi-agent pipeline.
    """
    try:
        from agents.services import A2AService

        logger.info(
            f'Starting async orchestration pipeline for customer: {customer_id}'
        )
        a2a_service = A2AService()
        result = a2a_service.orchestrate_pipeline(customer_id, campaign_id)
        logger.info(f'Orchestration pipeline completed: {result.get("status")}')
        return result

    except Exception as exc:
        logger.error(f'Error in orchestration pipeline for {customer_id}: {exc}')
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def async_execute_agent(self, agent_config_id, input_data):
    """
    Execute a specific agent with provided input data.
    """
    try:
        from agents.models import AgentConfig
        from agents.services import AgentService

        agent_config = AgentConfig.objects.get(id=agent_config_id)
        agent_service = AgentService()

        logger.info(f'Executing agent: {agent_config.name} ({agent_config.agent_type})')

        # Route to the appropriate service method
        agent_type = agent_config.agent_type

        if agent_type == 'research':
            result = agent_service.research_customer(input_data.get('customer_id'))
        elif agent_type == 'pitch_generator':
            result = agent_service.generate_pitch(
                input_data.get('customer_id'),
                input_data.get('context', {}),
            )
        elif agent_type == 'scorer':
            result = agent_service.score_pitch(input_data.get('pitch_id'))
        elif agent_type == 'refiner':
            result = agent_service.refine_pitch(
                input_data.get('pitch_id'),
                input_data.get('feedback', ''),
            )
        elif agent_type == 'strategy':
            result = agent_service.campaign_strategy(input_data.get('campaign_id'))
        else:
            result = {'error': f'Unknown agent type: {agent_type}'}

        logger.info(f'Agent {agent_config.name} execution completed')
        return result

    except Exception as exc:
        logger.error(f'Error executing agent {agent_config_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)


@shared_task
def async_send_a2a_message(from_agent_id, to_agent_id, message_type, payload,
                           correlation_id=None):
    """Send an A2A message asynchronously."""
    try:
        from agents.models import AgentConfig
        from agents.services import A2AService

        from_agent = AgentConfig.objects.get(id=from_agent_id)
        to_agent = AgentConfig.objects.get(id=to_agent_id)

        a2a_service = A2AService()
        message = a2a_service.send_message(
            from_agent=from_agent,
            to_agent=to_agent,
            message_type=message_type,
            payload=payload,
            correlation_id=correlation_id,
        )

        return {
            'status': 'sent',
            'message_id': str(message.id),
            'correlation_id': str(message.correlation_id),
        }

    except Exception as exc:
        logger.error(f'Error sending A2A message: {exc}')
        return {'status': 'error', 'error': str(exc)}


@shared_task
def async_process_a2a_message(message_id):
    """Process an A2A message asynchronously."""
    try:
        from agents.services import A2AService

        a2a_service = A2AService()
        result = a2a_service.process_message(message_id)
        return {'status': 'processed', 'result': result}

    except Exception as exc:
        logger.error(f'Error processing A2A message {message_id}: {exc}')
        return {'status': 'error', 'error': str(exc)}
