"""
Pitch views.
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny  # TODO: Replace with proper auth
from rest_framework.response import Response

from .models import Pitch, PitchScore, PitchTemplate
from .serializers import (
    PitchCompareSerializer,
    PitchDetailSerializer,
    PitchGenerateSerializer,
    PitchRefineSerializer,
    PitchScoreSerializer,
    PitchSerializer,
    PitchTemplateSerializer,
)
from .tasks import async_refine_pitch, async_score_pitch

import logging

logger = logging.getLogger(__name__)


class PitchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pitches.
    Supports generation, scoring, refinement, history, comparison, and export.
    """
    queryset = Pitch.objects.filter(is_active=True).select_related('customer')
    serializer_class = PitchSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['customer', 'status', 'campaign', 'pitch_type', 'tone']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PitchDetailSerializer
        return PitchSerializer

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        Generate a pitch for a customer.

        Tries the AI agent pipeline first; falls back to template-based
        generation so a pitch record is always created and returned.
        """
        serializer = PitchGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer_id = str(serializer.validated_data['customer_id'])
        tone = serializer.validated_data.get('tone', 'professional')
        pitch_type = serializer.validated_data.get('pitch_type', 'initial')
        template_id = serializer.validated_data.get('template_id')
        campaign_id = serializer.validated_data.get('campaign_id')
        additional_context = serializer.validated_data.get('additional_context', '')

        from customers.models import Customer

        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        title = f'Pitch for {customer.company}'
        content = ''
        generated_by = 'system'

        # Try AI generation first
        try:
            from agents.services import AgentService

            agent_service = AgentService()
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

            if template_id:
                try:
                    tmpl = PitchTemplate.objects.get(id=template_id)
                    context['template'] = tmpl.template_content
                    context['template_variables'] = tmpl.variables
                    tmpl.usage_count += 1
                    tmpl.save(update_fields=['usage_count'])
                except PitchTemplate.DoesNotExist:
                    pass

            result = agent_service.generate_pitch(customer_id, context)
            title = result.get('title', title)
            content = result.get('content', '')
            generated_by = 'pitch_generator_agent'

        except Exception as e:
            logger.warning('AI generation failed, using template fallback: %s', e)

            # Fallback: use template content or generate from customer data
            template = None
            if template_id:
                try:
                    template = PitchTemplate.objects.get(id=template_id)
                    template.usage_count += 1
                    template.save(update_fields=['usage_count'])
                except PitchTemplate.DoesNotExist:
                    pass

            if not template:
                template = (
                    PitchTemplate.objects.filter(
                        is_active=True, pitch_type=pitch_type,
                        industry=customer.industry,
                    ).first()
                    or PitchTemplate.objects.filter(
                        is_active=True, pitch_type=pitch_type, industry='',
                    ).first()
                    or PitchTemplate.objects.filter(is_active=True).first()
                )

            if template:
                title = f'{template.name} \u2014 {customer.company}'
                content = template.template_content
                replacements = {
                    'company_name': customer.company,
                    'contact_name': customer.name,
                    'industry': customer.industry,
                }
                for var, val in replacements.items():
                    content = content.replace('{' + var + '}', val or '')
                generated_by = f'template:{template.id}'
            else:
                title = (
                    f'{pitch_type.replace("_", " ").title()} Pitch '
                    f'\u2014 {customer.company}'
                )
                content = (
                    f'Dear {customer.name},\n\n'
                    f'I hope this message finds you well. I\'m reaching out to '
                    f'{customer.company} regarding opportunities in the '
                    f'{customer.industry} space.\n\n'
                    f'{additional_context}\n\n'
                    f'I\'d love to discuss how we can help your team achieve '
                    f'its goals.\n\n'
                    f'Best regards'
                )
                generated_by = 'fallback'

        pitch = Pitch.objects.create(
            customer=customer,
            title=title,
            content=content,
            pitch_type=pitch_type,
            status='generated',
            tone=tone,
            generated_by=generated_by,
            campaign_id=campaign_id,
            metadata={'additional_context': additional_context},
        )

        return Response(
            PitchSerializer(pitch).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='score')
    def score(self, request, pk=None):
        """Trigger pitch scoring via the AI scorer agent."""
        pitch = self.get_object()
        task = async_score_pitch.delay(str(pitch.id))

        return Response(
            {
                'message': 'Pitch scoring started',
                'task_id': task.id,
                'pitch_id': str(pitch.id),
                'status': 'pending',
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['post'], url_path='refine')
    def refine(self, request, pk=None):
        """Refine a pitch based on feedback, returning the new version."""
        pitch = self.get_object()
        serializer = PitchRefineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        feedback = serializer.validated_data['feedback']
        tone = serializer.validated_data.get('tone') or pitch.tone

        # Try AI refinement, fall back to simple append
        title = pitch.title
        content = pitch.content
        generated_by = 'fallback'
        try:
            from agents.services import AgentService
            agent_service = AgentService()
            result = agent_service.refine_pitch(str(pitch.id), feedback)
            title = result.get('title', title)
            content = result.get('content', content)
            generated_by = 'refiner_agent'
        except Exception as e:
            logger.warning('AI refinement failed, using fallback: %s', e)
            content = (
                f'{pitch.content}\n\n---\n\n'
                f'**Refinement based on feedback:** {feedback}'
            )

        refined_pitch = Pitch.objects.create(
            customer=pitch.customer,
            title=title,
            content=content,
            pitch_type='refined',
            version=pitch.version + 1,
            status='refined',
            tone=tone,
            generated_by=generated_by,
            parent_pitch=pitch,
            campaign=pitch.campaign,
            feedback=feedback,
            metadata={
                'refinement_feedback': feedback,
                'parent_version': pitch.version,
            },
        )

        return Response(
            PitchSerializer(refined_pitch).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """Return the full version history of a pitch."""
        pitch = self.get_object()

        # Walk up to find the root pitch
        root = pitch
        while root.parent_pitch is not None:
            root = root.parent_pitch

        # Collect the full tree
        history = self._collect_versions(root)
        serializer = PitchSerializer(history, many=True)
        return Response(serializer.data)

    def _collect_versions(self, pitch):
        """Recursively collect all versions of a pitch."""
        versions = [pitch]
        for revision in pitch.revisions.all():
            versions.extend(self._collect_versions(revision))
        return versions

    @action(detail=False, methods=['post'], url_path='compare')
    def compare(self, request):
        """Compare multiple pitches side by side."""
        serializer = PitchCompareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pitch_ids = serializer.validated_data['pitch_ids']
        pitches = Pitch.objects.filter(id__in=pitch_ids, is_active=True)

        if pitches.count() != len(pitch_ids):
            return Response(
                {'error': 'One or more pitch IDs not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        comparison = []
        for pitch in pitches:
            detail_serializer = PitchDetailSerializer(pitch)
            comparison.append(detail_serializer.data)

        return Response({
            'pitches': comparison,
            'comparison_summary': {
                'count': len(comparison),
                'best_score': max(
                    (p.average_score for p in pitches if p.average_score is not None),
                    default=None,
                ),
            },
        })

    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        """Export pitch as formatted text or HTML."""
        pitch = self.get_object()
        format_type = request.query_params.get('format', 'text')

        if format_type == 'html':
            content = f"""
            <html>
            <head><title>{pitch.title}</title></head>
            <body>
                <h1>{pitch.title}</h1>
                <p><strong>Customer:</strong> {pitch.customer.name} ({pitch.customer.company})</p>
                <p><strong>Type:</strong> {pitch.get_pitch_type_display()}</p>
                <p><strong>Tone:</strong> {pitch.get_tone_display()}</p>
                <p><strong>Version:</strong> {pitch.version}</p>
                <p><strong>Status:</strong> {pitch.get_status_display()}</p>
                <hr>
                <div>{pitch.content}</div>
                <hr>
                <p><em>Generated by: {pitch.generated_by}</em></p>
            </body>
            </html>
            """
        else:
            content = (
                f"Title: {pitch.title}\n"
                f"Customer: {pitch.customer.name} ({pitch.customer.company})\n"
                f"Type: {pitch.get_pitch_type_display()}\n"
                f"Tone: {pitch.get_tone_display()}\n"
                f"Version: {pitch.version}\n"
                f"Status: {pitch.get_status_display()}\n"
                f"{'=' * 60}\n\n"
                f"{pitch.content}\n\n"
                f"{'=' * 60}\n"
                f"Generated by: {pitch.generated_by}\n"
            )

        return Response({
            'pitch_id': str(pitch.id),
            'format': format_type,
            'content': content,
        })


class PitchTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing pitch templates."""
    queryset = PitchTemplate.objects.filter(is_active=True)
    serializer_class = PitchTemplateSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['industry', 'pitch_type']


class PitchScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing pitch scores (read-only)."""
    queryset = PitchScore.objects.filter(is_active=True)
    serializer_class = PitchScoreSerializer
    # TODO: Replace AllowAny with proper authentication/authorization
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['pitch', 'dimension', 'scored_by']
