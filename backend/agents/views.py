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
    queryset = A2AMessage.objects.all().select_related('from_agent', 'to_agent')
    serializer_class = A2AMessageSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['from_agent', 'to_agent', 'message_type', 'status', 'correlation_id']


@api_view(['POST'])
@permission_classes([AllowAny])  # TODO: Replace with proper auth
def orchestrate_pitch(request):
    """
    Trigger the full multi-agent pitch orchestration pipeline.

    This endpoint starts the complete flow:
    Research -> Generate -> Score -> Refine (if needed) -> Final pitch
    """
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

    task = async_orchestrate_pipeline.delay(customer_id, campaign_id)

    return Response(
        {
            'message': f'Orchestration pipeline started for {customer.name}',
            'task_id': task.id,
            'customer_id': customer_id,
            'campaign_id': campaign_id,
            'status': 'pending',
        },
        status=status.HTTP_202_ACCEPTED,
    )
