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
        """Score a pitch synchronously and return scores matching PitchScore format."""
        pitch = self.get_object()

        # Default fallback scores (0-10 scale)
        dimensions = {
            'persuasiveness': 5.0,
            'clarity': 5.0,
            'relevance': 5.0,
            'personalization': 5.0,
            'call_to_action': 5.0,
        }
        feedback = ''
        suggestions = []

        try:
            from agents.services import AgentService
            agent_service = AgentService()
            ai_scores = agent_service.score_pitch(str(pitch.id))

            # AI returns 0-1 floats; convert to 0-10 scale
            for dim in dimensions:
                if dim in ai_scores:
                    raw = ai_scores[dim]
                    score_val = raw.get('score', 0.5) if isinstance(raw, dict) else float(raw)
                    dimensions[dim] = round(score_val * 10, 1)

            # Collect explanations as suggestions
            for dim, data in ai_scores.items():
                if isinstance(data, dict) and data.get('explanation'):
                    suggestions.append(f"{dim.replace('_', ' ').title()}: {data['explanation']}")
        except Exception as e:
            logger.warning('AI scoring failed, using fallback scores: %s', e)

        overall_score = round(sum(dimensions.values()) / len(dimensions), 1)

        # Save individual PitchScore records
        for dim, score_val in dimensions.items():
            PitchScore.objects.update_or_create(
                pitch=pitch,
                dimension=dim,
                scored_by='scorer_agent',
                defaults={
                    'score': score_val / 10.0,  # Store as 0-1 in DB
                    'explanation': '',
                },
            )

        # Update aggregate scores on pitch
        pitch.scores = {dim: score_val / 10.0 for dim, score_val in dimensions.items()}
        pitch.status = 'scored'
        pitch.save(update_fields=['scores', 'status', 'updated_at'])

        return Response({
            'overall_score': overall_score,
            'persuasiveness': dimensions['persuasiveness'],
            'clarity': dimensions['clarity'],
            'relevance': dimensions['relevance'],
            'personalization': dimensions['personalization'],
            'call_to_action': dimensions['call_to_action'],
            'feedback': feedback,
            'suggestions': suggestions,
        })

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

    def _build_pitch_html(self, pitch):
        """Build styled HTML from a pitch for export."""
        import markdown as md

        pitch_html = md.markdown(pitch.content or '', extensions=['extra', 'nl2br'])

        # Build score section if available
        score_html = ''
        if pitch.scores:
            rows = ''.join(
                f'<tr><td style="padding:4px 12px;">{dim.title()}</td>'
                f'<td style="padding:4px 12px;text-align:right;">{score * 100:.0f}%</td></tr>'
                for dim, score in pitch.scores.items()
            )
            avg = pitch.average_score
            score_html = f'''
            <h2 style="color:#4f46e5;">Scores</h2>
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
                <thead><tr style="background:#f3f4f6;">
                    <th style="padding:6px 12px;text-align:left;">Dimension</th>
                    <th style="padding:6px 12px;text-align:right;">Score</th>
                </tr></thead>
                <tbody>{rows}</tbody>
                <tfoot><tr style="background:#eef2ff;font-weight:bold;">
                    <td style="padding:6px 12px;">Overall</td>
                    <td style="padding:6px 12px;text-align:right;">{avg * 100:.0f}%</td>
                </tr></tfoot>
            </table>
            '''

        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{pitch.title}</title>
    <style>
        body {{ font-family: Helvetica, Arial, sans-serif; margin: 40px; color: #1f2937; line-height: 1.6; }}
        h1 {{ color: #111827; margin-bottom: 4px; }}
        .meta {{ color: #6b7280; font-size: 13px; margin-bottom: 24px; }}
        .meta span {{ margin-right: 16px; }}
        hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }}
        .content {{ font-size: 14px; }}
        .footer {{ margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; }}
        table {{ font-size: 13px; }}
        th {{ text-align: left; }}
    </style>
</head>
<body>
    <h1>{pitch.title}</h1>
    <div class="meta">
        <span><strong>Customer:</strong> {pitch.customer.name} ({pitch.customer.company})</span>
        <span><strong>Type:</strong> {pitch.get_pitch_type_display()}</span>
        <span><strong>Tone:</strong> {pitch.get_tone_display()}</span>
        <span><strong>Version:</strong> v{pitch.version}</span>
    </div>
    <hr>
    <div class="content">{pitch_html}</div>
    <hr>
    {score_html}
    <div class="footer">Generated by {pitch.generated_by} &bull; {pitch.created_at.strftime("%B %d, %Y %I:%M %p")}</div>
</body>
</html>'''

    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        """Export pitch as formatted text, HTML, or PDF."""
        pitch = self.get_object()
        format_type = request.query_params.get('format', 'text')

        if format_type == 'pdf':
            import io
            from django.http import HttpResponse
            from xhtml2pdf import pisa

            html = self._build_pitch_html(pitch)
            pdf_buffer = io.BytesIO()
            pisa_status = pisa.CreatePDF(io.StringIO(html), dest=pdf_buffer)
            if pisa_status.err:
                return Response(
                    {'error': 'Failed to generate PDF'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            pdf_buffer.seek(0)
            filename = f'{pitch.title or "pitch"}.pdf'.replace(' ', '_')
            response = HttpResponse(pdf_buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        if format_type == 'html':
            content = self._build_pitch_html(pitch)
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
