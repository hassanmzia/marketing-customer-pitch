"""
Agent views.
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny  # TODO: Replace with proper auth
from rest_framework.response import Response

from .models import AgentConfig, AgentExecution, A2AMessage
from .serializers import (
    A2AMessageSerializer,
    AgentConfigSerializer,
    AgentExecutionSerializer,
    ExecuteAgentSerializer,
    OrchestrateSerializer,
)
from .tasks import async_orchestrate_pipeline, async_execute_agent


class AgentConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for managing agent configurations."""
    queryset = AgentConfig.objects.all()
    serializer_class = AgentConfigSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['agent_type', 'is_active']


class AgentExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing agent executions (read-only) with execute action.
    """
    queryset = AgentExecution.objects.all().select_related('agent_config')
    serializer_class = AgentExecutionSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['agent_config', 'status']

    @action(detail=False, methods=['post'], url_path='execute')
    def execute(self, request):
        """Execute a specific agent with provided input data."""
        serializer = ExecuteAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent_config_id = request.data.get('agent_config_id')
        if not agent_config_id:
            return Response(
                {'error': 'agent_config_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            agent_config = AgentConfig.objects.get(id=agent_config_id, is_active=True)
        except AgentConfig.DoesNotExist:
            return Response(
                {'error': 'Agent configuration not found or inactive'},
                status=status.HTTP_404_NOT_FOUND,
            )

        task = async_execute_agent.delay(
            str(agent_config.id),
            serializer.validated_data['input_data'],
        )

        return Response(
            {
                'message': f'Agent {agent_config.name} execution started',
                'task_id': task.id,
                'agent': agent_config.name,
                'agent_type': agent_config.agent_type,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class A2AMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing A2A messages (read-only)."""
    queryset = A2AMessage.objects.all().select_related('from_agent', 'to_agent').order_by('-created_at')
    serializer_class = A2AMessageSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['from_agent', 'to_agent', 'message_type', 'status', 'correlation_id']

    def get_queryset(self):
        qs = super().get_queryset()
        # Support ?agent=<id> to filter messages where agent is sender OR receiver
        agent_id = self.request.query_params.get('agent')
        if agent_id:
            from django.db.models import Q
            qs = qs.filter(Q(from_agent_id=agent_id) | Q(to_agent_id=agent_id))
        return qs


@api_view(['POST'])
@permission_classes([AllowAny])  # TODO: Replace with proper auth
def orchestrate_pitch(request):
    """
    Trigger the full multi-agent pitch orchestration pipeline.

    Creates an AgentExecution record so the frontend can poll for progress.
    Tries synchronous orchestration first, falls back to Celery async.
    """
    import logging
    from django.utils import timezone

    logger = logging.getLogger(__name__)

    serializer = OrchestrateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    customer_id = str(serializer.validated_data['customer_id'])
    campaign_id = str(serializer.validated_data['campaign_id']) \
        if serializer.validated_data.get('campaign_id') else None

    # Verify customer exists
    from customers.models import Customer
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response(
            {'error': 'Customer not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get or create the orchestrator agent config
    orchestrator_config, _ = AgentConfig.objects.get_or_create(
        agent_type='orchestrator',
        defaults={
            'name': 'Pipeline Orchestrator',
            'description': 'Orchestrates the full pitch generation pipeline',
            'is_active': True,
            'metadata': {},
        },
    )

    # Create an execution record the frontend can poll
    execution = AgentExecution.objects.create(
        agent_config=orchestrator_config,
        input_data={
            'customer_id': customer_id,
            'campaign_id': campaign_id,
            'task': request.data.get('task', 'generate_pitch'),
        },
        status='running',
        started_at=timezone.now(),
    )

    # Try synchronous orchestration, fall back to async
    try:
        from .services import A2AService
        a2a_service = A2AService()
        result = a2a_service.orchestrate_pipeline(customer_id, campaign_id)

        execution.status = 'completed'
        execution.output_data = result if isinstance(result, dict) else {'result': str(result)}
        execution.completed_at = timezone.now()
        execution.save(update_fields=['status', 'output_data', 'completed_at'])
    except Exception as e:
        logger.warning('Synchronous orchestration failed, trying async: %s', e)
        try:
            task = async_orchestrate_pipeline.delay(customer_id, campaign_id)
            execution.output_data = {'celery_task_id': task.id}
            execution.save(update_fields=['output_data'])
        except Exception as async_err:
            logger.warning('Async orchestration also failed: %s', async_err)
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
            execution.save(update_fields=['status', 'error_message', 'completed_at'])

    exec_data = AgentExecutionSerializer(execution).data

    return Response(
        {
            'id': str(execution.id),
            'execution_id': str(execution.id),
            'message': f'Orchestration pipeline started for {customer.name}',
            'customer_id': customer_id,
            'campaign_id': campaign_id,
            'status': execution.status,
            **exec_data,
        },
        status=status.HTTP_202_ACCEPTED,
    )
