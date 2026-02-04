"""
Agent services for AI Marketing Customer Pitch Assistant.

Contains the core AgentService and A2AService classes that power the
multi-agent system with MCP and A2A support.
"""
import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class AgentService:
    """
    Core service for AI agent operations.
    Wraps LangChain / LLM calls for research, generation, scoring, and refinement.
    """

    def __init__(self):
        self._llm = None

    def get_llm(self):
        """
        Returns a ChatOpenAI instance configured from Django settings.
        Lazily initialized and cached.
        """
        if self._llm is None:
            try:
                from langchain_openai import ChatOpenAI
                self._llm = ChatOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    model=settings.OPENAI_MODEL,
                    temperature=settings.OPENAI_TEMPERATURE,
                    max_tokens=settings.OPENAI_MAX_TOKENS,
                )
            except Exception as e:
                logger.error(f'Failed to initialize LLM: {e}')
                raise
        return self._llm

    def _get_agent_config(self, agent_type):
        """Retrieve agent configuration from the database."""
        from agents.models import AgentConfig
        try:
            return AgentConfig.objects.get(agent_type=agent_type, is_active=True)
        except AgentConfig.DoesNotExist:
            logger.warning(f'No active agent config for type: {agent_type}')
            return None

    def _log_execution(self, agent_config, input_data, output_data, status,
                       started_at, tokens_used=0, cost=0.0, error_message=''):
        """Log an agent execution to the database."""
        from agents.models import AgentExecution
        return AgentExecution.objects.create(
            agent_config=agent_config,
            input_data=input_data,
            output_data=output_data,
            status=status,
            started_at=started_at,
            completed_at=timezone.now(),
            tokens_used=tokens_used,
            cost=Decimal(str(cost)),
            error_message=error_message,
        )

    def research_customer(self, customer_id):
        """
        Use LangChain to research a customer. Calls MCP tools for data enrichment.

        Args:
            customer_id: UUID of the customer to research.

        Returns:
            dict with research findings.
        """
        from customers.models import Customer

        customer = Customer.objects.get(id=customer_id)
        agent_config = self._get_agent_config('research')
        started_at = timezone.now()

        try:
            llm = self.get_llm()

            system_prompt = (
                agent_config.system_prompt if agent_config else
                "You are a market research specialist. Analyze the following customer "
                "information and provide insights about their business, industry trends, "
                "pain points, and potential opportunities."
            )

            # Build the research prompt
            research_prompt = (
                f"Research the following customer and provide detailed insights:\n\n"
                f"Name: {customer.name}\n"
                f"Company: {customer.company}\n"
                f"Industry: {customer.industry}\n"
                f"Company Size: {customer.company_size}\n"
                f"Website: {customer.website}\n"
                f"Description: {customer.description}\n"
                f"Tags: {', '.join(customer.tags) if customer.tags else 'None'}\n\n"
                f"Please provide:\n"
                f"1. Industry analysis and current trends\n"
                f"2. Potential pain points for this type of company\n"
                f"3. Competitive landscape insights\n"
                f"4. Recommended approach and talking points\n"
                f"5. Key value propositions to emphasize\n"
            )

            # Try MCP-enhanced research first
            try:
                result = self._research_with_mcp(customer, research_prompt)
            except Exception as mcp_err:
                logger.warning(f'MCP research failed, falling back to LLM: {mcp_err}')
                result = self._research_with_llm(llm, system_prompt, research_prompt)

            # Log execution
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'customer_id': str(customer_id)},
                    output_data=result,
                    status='completed',
                    started_at=started_at,
                )

            return result

        except Exception as e:
            logger.error(f'Error researching customer {customer_id}: {e}')
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'customer_id': str(customer_id)},
                    output_data={},
                    status='failed',
                    started_at=started_at,
                    error_message=str(e),
                )
            raise

    def _research_with_mcp(self, customer, research_prompt):
        """
        Perform research using MCP (Model Context Protocol) tools.

        Connects to the MCP server to access external data sources for
        enriched customer research.
        """
        import httpx

        mcp_url = settings.MCP_SERVER_URL
        logger.info(f'Attempting MCP research via {mcp_url}')

        # Call MCP server for customer research
        response = httpx.post(
            f'{mcp_url}/tools/research',
            json={
                'company': customer.company,
                'industry': customer.industry,
                'website': customer.website,
            },
            timeout=30.0,
        )

        if response.status_code == 200:
            mcp_data = response.json()
            return {
                'source': 'mcp',
                'research': mcp_data,
                'industry_trends': mcp_data.get('trends', []),
                'pain_points': mcp_data.get('pain_points', []),
                'opportunities': mcp_data.get('opportunities', []),
                'competitive_landscape': mcp_data.get('competitive_landscape', {}),
                'recommendations': mcp_data.get('recommendations', []),
            }
        else:
            raise Exception(f'MCP server returned {response.status_code}')

    def _research_with_llm(self, llm, system_prompt, research_prompt):
        """Perform research using direct LLM call."""
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=research_prompt),
        ]

        response = llm.invoke(messages)

        return {
            'source': 'llm',
            'research': response.content,
            'model': settings.OPENAI_MODEL,
        }

    def generate_pitch(self, customer_id, context):
        """
        Generate a marketing pitch for a customer using LLM.

        Args:
            customer_id: UUID of the customer.
            context: dict with generation context (tone, template, etc.)

        Returns:
            dict with title and content of the generated pitch.
        """
        from customers.models import Customer

        customer = Customer.objects.get(id=customer_id)
        agent_config = self._get_agent_config('pitch_generator')
        started_at = timezone.now()

        try:
            llm = self.get_llm()

            system_prompt = (
                agent_config.system_prompt if agent_config else
                "You are an expert marketing copywriter specializing in B2B sales pitches. "
                "Create compelling, personalized pitches that resonate with the target audience."
            )

            tone = context.get('tone', 'professional')
            template = context.get('template', '')
            additional_context = context.get('additional_context', '')

            generation_prompt = (
                f"Generate a compelling marketing pitch for the following customer:\n\n"
                f"Customer: {customer.name}\n"
                f"Company: {customer.company}\n"
                f"Industry: {customer.industry}\n"
                f"Company Size: {customer.company_size}\n"
                f"Description: {customer.description}\n"
                f"Preferences: {json.dumps(customer.preferences)}\n\n"
                f"Tone: {tone}\n"
            )

            if template:
                generation_prompt += f"\nUse this template as a guide:\n{template}\n"

            if additional_context:
                generation_prompt += f"\nAdditional context:\n{additional_context}\n"

            generation_prompt += (
                "\n\nPlease provide:\n"
                "1. A compelling title (single line)\n"
                "2. The full pitch content\n\n"
                "Format your response as:\n"
                "TITLE: [your title here]\n"
                "CONTENT:\n[your pitch content here]"
            )

            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=generation_prompt),
            ]

            response = llm.invoke(messages)
            content = response.content

            # Parse title and content
            title = f'Pitch for {customer.company}'
            pitch_content = content

            if 'TITLE:' in content:
                parts = content.split('CONTENT:', 1)
                title_part = parts[0].replace('TITLE:', '').strip()
                if title_part:
                    title = title_part
                if len(parts) > 1:
                    pitch_content = parts[1].strip()

            result = {
                'title': title,
                'content': pitch_content,
                'metadata': {
                    'model': settings.OPENAI_MODEL,
                    'tone': tone,
                    'customer_id': str(customer_id),
                },
            }

            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'customer_id': str(customer_id), 'context': context},
                    output_data=result,
                    status='completed',
                    started_at=started_at,
                )

            return result

        except Exception as e:
            logger.error(f'Error generating pitch for customer {customer_id}: {e}')
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'customer_id': str(customer_id), 'context': context},
                    output_data={},
                    status='failed',
                    started_at=started_at,
                    error_message=str(e),
                )
            raise

    def score_pitch(self, pitch_id):
        """
        Score a pitch on persuasiveness, clarity, and relevance.

        Args:
            pitch_id: UUID of the pitch to score.

        Returns:
            dict with scoring dimensions and explanations.
        """
        from pitches.models import Pitch

        pitch = Pitch.objects.select_related('customer').get(id=pitch_id)
        agent_config = self._get_agent_config('scorer')
        started_at = timezone.now()

        try:
            llm = self.get_llm()

            system_prompt = (
                agent_config.system_prompt if agent_config else
                "You are a marketing pitch evaluation expert. Score pitches on specific "
                "dimensions and provide constructive feedback. Be critical but fair."
            )

            scoring_prompt = (
                f"Evaluate the following marketing pitch:\n\n"
                f"Title: {pitch.title}\n"
                f"Target Customer: {pitch.customer.name} ({pitch.customer.company})\n"
                f"Industry: {pitch.customer.industry}\n"
                f"Tone: {pitch.tone}\n\n"
                f"Pitch Content:\n{pitch.content}\n\n"
                f"Score the pitch on the following dimensions (0.0 to 1.0):\n"
                f"1. Persuasiveness - How compelling and convincing is the pitch?\n"
                f"2. Clarity - How clear and easy to understand is the message?\n"
                f"3. Relevance - How well does the pitch address the customer's needs?\n\n"
                f"Respond in JSON format:\n"
                f'{{"persuasiveness": {{"score": 0.0, "explanation": "..."}}, '
                f'"clarity": {{"score": 0.0, "explanation": "..."}}, '
                f'"relevance": {{"score": 0.0, "explanation": "..."}}}}'
            )

            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=scoring_prompt),
            ]

            response = llm.invoke(messages)

            # Parse JSON response
            try:
                # Try to extract JSON from the response
                response_text = response.content.strip()
                # Handle markdown code blocks
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0]
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0]

                scores = json.loads(response_text)
            except (json.JSONDecodeError, IndexError):
                logger.warning(
                    f'Failed to parse scorer response as JSON. '
                    f'Using default scores. Response: {response.content[:200]}'
                )
                scores = {
                    'persuasiveness': {'score': 0.5, 'explanation': 'Unable to parse score'},
                    'clarity': {'score': 0.5, 'explanation': 'Unable to parse score'},
                    'relevance': {'score': 0.5, 'explanation': 'Unable to parse score'},
                }

            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'pitch_id': str(pitch_id)},
                    output_data=scores,
                    status='completed',
                    started_at=started_at,
                )

            return scores

        except Exception as e:
            logger.error(f'Error scoring pitch {pitch_id}: {e}')
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'pitch_id': str(pitch_id)},
                    output_data={},
                    status='failed',
                    started_at=started_at,
                    error_message=str(e),
                )
            raise

    def refine_pitch(self, pitch_id, feedback):
        """
        Refine an existing pitch based on feedback.

        Args:
            pitch_id: UUID of the pitch to refine.
            feedback: string with refinement feedback.

        Returns:
            dict with refined title and content.
        """
        from pitches.models import Pitch

        pitch = Pitch.objects.select_related('customer').get(id=pitch_id)
        agent_config = self._get_agent_config('refiner')
        started_at = timezone.now()

        try:
            llm = self.get_llm()

            system_prompt = (
                agent_config.system_prompt if agent_config else
                "You are a marketing pitch refinement specialist. Improve pitches "
                "based on feedback while maintaining the core message and tone."
            )

            refinement_prompt = (
                f"Refine the following marketing pitch based on the feedback provided:\n\n"
                f"Original Title: {pitch.title}\n"
                f"Target Customer: {pitch.customer.name} ({pitch.customer.company})\n"
                f"Industry: {pitch.customer.industry}\n"
                f"Tone: {pitch.tone}\n\n"
                f"Original Pitch:\n{pitch.content}\n\n"
                f"Current Scores: {json.dumps(pitch.scores)}\n\n"
                f"Feedback for improvement:\n{feedback}\n\n"
                f"Please provide the refined pitch maintaining the same tone "
                f"and addressing all feedback points.\n\n"
                f"Format your response as:\n"
                f"TITLE: [your refined title here]\n"
                f"CONTENT:\n[your refined pitch content here]"
            )

            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=refinement_prompt),
            ]

            response = llm.invoke(messages)
            content = response.content

            # Parse title and content
            title = pitch.title
            pitch_content = content

            if 'TITLE:' in content:
                parts = content.split('CONTENT:', 1)
                title_part = parts[0].replace('TITLE:', '').strip()
                if title_part:
                    title = title_part
                if len(parts) > 1:
                    pitch_content = parts[1].strip()

            result = {
                'title': title,
                'content': pitch_content,
                'metadata': {
                    'model': settings.OPENAI_MODEL,
                    'original_pitch_id': str(pitch_id),
                    'feedback': feedback,
                },
            }

            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'pitch_id': str(pitch_id), 'feedback': feedback},
                    output_data=result,
                    status='completed',
                    started_at=started_at,
                )

            return result

        except Exception as e:
            logger.error(f'Error refining pitch {pitch_id}: {e}')
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'pitch_id': str(pitch_id), 'feedback': feedback},
                    output_data={},
                    status='failed',
                    started_at=started_at,
                    error_message=str(e),
                )
            raise

    def campaign_strategy(self, campaign_id):
        """
        Generate a campaign strategy using the strategy agent.

        Args:
            campaign_id: UUID of the campaign.

        Returns:
            dict with strategy recommendations.
        """
        from campaigns.models import Campaign

        campaign = Campaign.objects.get(id=campaign_id)
        agent_config = self._get_agent_config('strategy')
        started_at = timezone.now()

        try:
            llm = self.get_llm()

            system_prompt = (
                agent_config.system_prompt if agent_config else
                "You are a marketing campaign strategist. Develop comprehensive "
                "campaign strategies based on target audience and goals."
            )

            targets = campaign.targets.select_related('customer').all()
            target_info = [
                {
                    'name': t.customer.name,
                    'company': t.customer.company,
                    'industry': t.customer.industry,
                    'size': t.customer.company_size,
                }
                for t in targets[:20]  # Limit to 20 for prompt size
            ]

            strategy_prompt = (
                f"Develop a campaign strategy for the following campaign:\n\n"
                f"Campaign: {campaign.name}\n"
                f"Description: {campaign.description}\n"
                f"Type: {campaign.campaign_type}\n"
                f"Target Industry: {campaign.target_industry}\n"
                f"Target Company Size: {campaign.target_company_size}\n"
                f"Budget: ${campaign.budget}\n"
                f"Goals: {json.dumps(campaign.goals)}\n\n"
                f"Target Customers ({targets.count()} total):\n"
                f"{json.dumps(target_info, indent=2)}\n\n"
                f"Please provide:\n"
                f"1. Overall campaign strategy\n"
                f"2. Messaging framework\n"
                f"3. Channel recommendations\n"
                f"4. Timeline and milestones\n"
                f"5. Success metrics and KPIs\n"
                f"6. Risk factors and mitigation\n"
            )

            from langchain_core.messages import HumanMessage, SystemMessage

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=strategy_prompt),
            ]

            response = llm.invoke(messages)

            result = {
                'strategy': response.content,
                'campaign_id': str(campaign_id),
                'model': settings.OPENAI_MODEL,
            }

            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'campaign_id': str(campaign_id)},
                    output_data=result,
                    status='completed',
                    started_at=started_at,
                )

            return result

        except Exception as e:
            logger.error(f'Error generating campaign strategy {campaign_id}: {e}')
            if agent_config:
                self._log_execution(
                    agent_config=agent_config,
                    input_data={'campaign_id': str(campaign_id)},
                    output_data={},
                    status='failed',
                    started_at=started_at,
                    error_message=str(e),
                )
            raise


class A2AService:
    """
    Agent-to-Agent service for inter-agent communication and orchestration.
    Implements the full multi-agent pipeline with message passing.
    """

    def __init__(self):
        self.agent_service = AgentService()

    def send_message(self, from_agent, to_agent, message_type, payload,
                     correlation_id=None, parent_message=None):
        """
        Send an A2A message between agents.

        Args:
            from_agent: AgentConfig instance (sender).
            to_agent: AgentConfig instance (receiver).
            message_type: str (request/response/broadcast/delegate).
            payload: dict with message data.
            correlation_id: UUID to link related messages.
            parent_message: optional parent A2AMessage for threading.

        Returns:
            A2AMessage instance.
        """
        from agents.models import A2AMessage

        message = A2AMessage.objects.create(
            from_agent=from_agent,
            to_agent=to_agent,
            message_type=message_type,
            payload=payload,
            correlation_id=correlation_id or uuid.uuid4(),
            status='sent',
            parent_message=parent_message,
        )

        logger.info(
            f'A2A Message sent: {from_agent.name} -> {to_agent.name} '
            f'({message_type}) [correlation: {message.correlation_id}]'
        )

        return message

    def process_message(self, message_id):
        """
        Process a received A2A message by executing the appropriate agent action.

        Args:
            message_id: UUID of the A2AMessage to process.

        Returns:
            dict with processing result.
        """
        from agents.models import A2AMessage

        message = A2AMessage.objects.select_related(
            'from_agent', 'to_agent'
        ).get(id=message_id)

        message.status = 'received'
        message.save(update_fields=['status', 'updated_at'])

        try:
            agent_type = message.to_agent.agent_type
            payload = message.payload
            result = {}

            if agent_type == 'research':
                result = self.agent_service.research_customer(
                    payload.get('customer_id')
                )
            elif agent_type == 'pitch_generator':
                result = self.agent_service.generate_pitch(
                    payload.get('customer_id'),
                    payload.get('context', {}),
                )
            elif agent_type == 'scorer':
                result = self.agent_service.score_pitch(
                    payload.get('pitch_id')
                )
            elif agent_type == 'refiner':
                result = self.agent_service.refine_pitch(
                    payload.get('pitch_id'),
                    payload.get('feedback', ''),
                )
            elif agent_type == 'strategy':
                result = self.agent_service.campaign_strategy(
                    payload.get('campaign_id')
                )

            message.status = 'processed'
            message.save(update_fields=['status', 'updated_at'])

            return result

        except Exception as e:
            message.status = 'failed'
            message.save(update_fields=['status', 'updated_at'])
            logger.error(f'Error processing A2A message {message_id}: {e}')
            raise

    def orchestrate_pipeline(self, customer_id, campaign_id=None):
        """
        Full multi-agent orchestration pipeline.

        1. Research agent researches customer
        2. Sends A2A message to pitch generator
        3. Pitch generator creates pitch
        4. Sends A2A message to scorer
        5. Scorer evaluates pitch
        6. If score < threshold, sends to refiner
        7. Refiner improves pitch
        8. Returns final result

        Args:
            customer_id: UUID of the customer.
            campaign_id: Optional UUID of the campaign.

        Returns:
            dict with pipeline results including final pitch.
        """
        from agents.models import AgentConfig
        from customers.models import Customer
        from pitches.models import Pitch, PitchScore

        customer = Customer.objects.get(id=customer_id)
        correlation_id = uuid.uuid4()
        score_threshold = settings.AGENT_SCORE_THRESHOLD
        max_refinements = settings.AGENT_MAX_REFINEMENT_ITERATIONS

        logger.info(
            f'Starting orchestration pipeline for customer: {customer.name} '
            f'[correlation: {correlation_id}]'
        )

        # Get or create agent configs so A2A messages are always recorded
        agent_defaults = {
            'research': {
                'name': 'Research Agent',
                'description': 'Researches customer profiles and industry trends',
            },
            'pitch_generator': {
                'name': 'Pitch Generator Agent',
                'description': 'Generates personalized sales pitches',
            },
            'scorer': {
                'name': 'Scoring Agent',
                'description': 'Evaluates pitch quality on multiple dimensions',
            },
            'refiner': {
                'name': 'Refinement Agent',
                'description': 'Refines pitches based on scoring feedback',
            },
            'orchestrator': {
                'name': 'Pipeline Orchestrator',
                'description': 'Coordinates the multi-agent pipeline',
            },
        }
        agents = {}
        for agent_type in agent_defaults:
            agent, created = AgentConfig.objects.get_or_create(
                agent_type=agent_type,
                defaults={**agent_defaults[agent_type], 'is_active': True, 'metadata': {}},
            )
            if created:
                logger.info(f'Auto-created {agent_type} agent config')
            agents[agent_type] = agent

        orchestrator = agents.get('orchestrator')
        pipeline_result = {
            'customer_id': str(customer_id),
            'campaign_id': str(campaign_id) if campaign_id else None,
            'correlation_id': str(correlation_id),
            'steps': [],
        }

        # Step 1: Research
        logger.info('Step 1: Researching customer...')
        research_msg = None
        if orchestrator and agents.get('research'):
            research_msg = self.send_message(
                from_agent=orchestrator,
                to_agent=agents['research'],
                message_type='request',
                payload={'customer_id': str(customer_id)},
                correlation_id=correlation_id,
            )

        try:
            research_result = self.agent_service.research_customer(str(customer_id))
            pipeline_result['steps'].append({
                'step': 'research',
                'status': 'completed',
                'message_id': str(research_msg.id) if research_msg else None,
            })
        except Exception as e:
            logger.warning(f'Research step failed: {e}. Continuing with basic context.')
            research_result = {}
            pipeline_result['steps'].append({
                'step': 'research',
                'status': 'failed',
                'error': str(e),
            })

        # Step 2: Generate pitch
        logger.info('Step 2: Generating pitch...')
        context = {
            'customer_name': customer.name,
            'company': customer.company,
            'industry': customer.industry,
            'company_size': customer.company_size,
            'description': customer.description,
            'preferences': customer.preferences,
            'tone': 'professional',
            'research': research_result,
        }

        if orchestrator and agents.get('pitch_generator'):
            gen_msg = self.send_message(
                from_agent=orchestrator,
                to_agent=agents['pitch_generator'],
                message_type='delegate',
                payload={
                    'customer_id': str(customer_id),
                    'context': context,
                },
                correlation_id=correlation_id,
                parent_message=research_msg,
            )
        else:
            gen_msg = None

        pitch_result = self.agent_service.generate_pitch(str(customer_id), context)

        # Create pitch record
        pitch = Pitch.objects.create(
            customer=customer,
            title=pitch_result.get('title', f'Pitch for {customer.company}'),
            content=pitch_result.get('content', ''),
            pitch_type='initial',
            status='generated',
            tone='professional',
            generated_by='pitch_generator_agent',
            campaign_id=campaign_id,
            metadata=pitch_result.get('metadata', {}),
        )

        pipeline_result['steps'].append({
            'step': 'generate',
            'status': 'completed',
            'pitch_id': str(pitch.id),
            'message_id': str(gen_msg.id) if gen_msg else None,
        })

        # Step 3: Score pitch
        logger.info('Step 3: Scoring pitch...')
        if orchestrator and agents.get('scorer'):
            score_msg = self.send_message(
                from_agent=orchestrator,
                to_agent=agents['scorer'],
                message_type='request',
                payload={'pitch_id': str(pitch.id)},
                correlation_id=correlation_id,
                parent_message=gen_msg,
            )
        else:
            score_msg = None

        scores = self.agent_service.score_pitch(str(pitch.id))

        # Save scores
        for dimension, data in scores.items():
            PitchScore.objects.create(
                pitch=pitch,
                dimension=dimension,
                score=data.get('score', 0.0),
                explanation=data.get('explanation', ''),
                scored_by='scorer_agent',
            )

        pitch.scores = {dim: data.get('score', 0.0) for dim, data in scores.items()}
        pitch.status = 'scored'
        pitch.save(update_fields=['scores', 'status', 'updated_at'])

        avg_score = pitch.average_score or 0.0
        pipeline_result['steps'].append({
            'step': 'score',
            'status': 'completed',
            'scores': pitch.scores,
            'average_score': avg_score,
            'message_id': str(score_msg.id) if score_msg else None,
        })

        # Step 4: Refine if needed
        refinement_count = 0
        while avg_score < score_threshold and refinement_count < max_refinements:
            refinement_count += 1
            logger.info(
                f'Step 4.{refinement_count}: Refining pitch '
                f'(score {avg_score:.2f} < threshold {score_threshold})...'
            )

            # Build feedback from scores
            feedback_parts = []
            for dim, data in scores.items():
                if isinstance(data, dict) and data.get('score', 1.0) < score_threshold:
                    feedback_parts.append(
                        f"Improve {dim}: {data.get('explanation', 'Score too low')}"
                    )
            feedback = '; '.join(feedback_parts) if feedback_parts else 'General improvement needed'

            if orchestrator and agents.get('refiner'):
                refine_msg = self.send_message(
                    from_agent=orchestrator,
                    to_agent=agents['refiner'],
                    message_type='delegate',
                    payload={
                        'pitch_id': str(pitch.id),
                        'feedback': feedback,
                    },
                    correlation_id=correlation_id,
                    parent_message=score_msg,
                )
            else:
                refine_msg = None

            refine_result = self.agent_service.refine_pitch(str(pitch.id), feedback)

            # Create refined pitch
            refined_pitch = Pitch.objects.create(
                customer=customer,
                title=refine_result.get('title', pitch.title),
                content=refine_result.get('content', ''),
                pitch_type='refined',
                version=pitch.version + 1,
                status='refined',
                tone=pitch.tone,
                generated_by='refiner_agent',
                parent_pitch=pitch,
                campaign_id=campaign_id,
                feedback=feedback,
                metadata=refine_result.get('metadata', {}),
            )

            # Re-score the refined pitch
            scores = self.agent_service.score_pitch(str(refined_pitch.id))
            for dimension, data in scores.items():
                PitchScore.objects.create(
                    pitch=refined_pitch,
                    dimension=dimension,
                    score=data.get('score', 0.0),
                    explanation=data.get('explanation', ''),
                    scored_by='scorer_agent',
                )

            refined_pitch.scores = {
                dim: data.get('score', 0.0) for dim, data in scores.items()
            }
            refined_pitch.status = 'scored'
            refined_pitch.save(update_fields=['scores', 'status', 'updated_at'])

            avg_score = refined_pitch.average_score or 0.0
            pitch = refined_pitch  # Update reference for next iteration

            pipeline_result['steps'].append({
                'step': f'refine_{refinement_count}',
                'status': 'completed',
                'pitch_id': str(refined_pitch.id),
                'scores': refined_pitch.scores,
                'average_score': avg_score,
                'message_id': str(refine_msg.id) if refine_msg else None,
            })

        # Mark final pitch
        final_status = 'approved' if avg_score >= score_threshold else 'refined'
        pitch.status = final_status
        pitch.pitch_type = 'final'
        pitch.save(update_fields=['status', 'pitch_type', 'updated_at'])

        pipeline_result['final_pitch_id'] = str(pitch.id)
        pipeline_result['final_score'] = avg_score
        pipeline_result['refinement_rounds'] = refinement_count
        pipeline_result['status'] = 'completed'

        logger.info(
            f'Orchestration pipeline completed for {customer.name}. '
            f'Final pitch: {pitch.id}, Score: {avg_score:.2f}, '
            f'Refinements: {refinement_count}'
        )

        return pipeline_result
