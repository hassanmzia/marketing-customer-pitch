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
from .tasks import async_generate_pitch, async_refine_pitch, async_score_pitch


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
        Trigger pitch generation via the AI agent pipeline.
        """
        serializer = PitchGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = async_generate_pitch.delay(
            customer_id=str(serializer.validated_data['customer_id']),
            tone=serializer.validated_data.get('tone', 'professional'),
            pitch_type=serializer.validated_data.get('pitch_type', 'initial'),
            template_id=str(serializer.validated_data['template_id'])
            if serializer.validated_data.get('template_id') else None,
            campaign_id=str(serializer.validated_data['campaign_id'])
            if serializer.validated_data.get('campaign_id') else None,
            additional_context=serializer.validated_data.get('additional_context', ''),
        )

        return Response(
            {
                'message': 'Pitch generation started',
                'task_id': task.id,
                'status': 'pending',
            },
            status=status.HTTP_202_ACCEPTED,
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
        """Trigger pitch refinement based on feedback."""
        pitch = self.get_object()
        serializer = PitchRefineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = async_refine_pitch.delay(
            pitch_id=str(pitch.id),
            feedback=serializer.validated_data['feedback'],
            tone=serializer.validated_data.get('tone'),
        )

        return Response(
            {
                'message': 'Pitch refinement started',
                'task_id': task.id,
                'pitch_id': str(pitch.id),
                'status': 'pending',
            },
            status=status.HTTP_202_ACCEPTED,
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
