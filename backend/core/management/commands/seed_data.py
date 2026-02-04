import json
from django.core.management.base import BaseCommand
from customers.models import Customer, CustomerInteraction
from agents.models import AgentConfig
from pitches.models import PitchTemplate
from campaigns.models import Campaign
from analytics.models import DashboardMetric
from django.utils import timezone
from datetime import timedelta
import uuid


class Command(BaseCommand):
    help = 'Seed database with initial data from notebook CUSTOMER_DB and additional records'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        self.seed_customers()
        self.seed_agent_configs()
        self.seed_pitch_templates()
        self.seed_campaigns()
        self.seed_dashboard_metrics()
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))

    def seed_customers(self):
        customers_data = [
            {
                'name': 'Acme Corp',
                'company': 'Acme Corporation',
                'industry': 'Manufacturing',
                'company_size': 'enterprise',
                'email': 'contact@acmecorp.com',
                'phone': '+1-555-0101',
                'website': 'https://www.acmecorp.com',
                'description': 'Leading manufacturer of road runner catching devices. Known for innovation and quality.',
                'preferences': {'communication': 'email', 'meeting_time': 'morning', 'interests': ['innovation', 'quality assurance', 'automation']},
                'interaction_history': [
                    {'date': '2024-01-15', 'type': 'email', 'summary': 'Initial outreach about manufacturing solutions'},
                    {'date': '2024-02-01', 'type': 'demo', 'summary': 'Product demonstration of quality control system'}
                ],
                'customer_360_data': {'annual_revenue': '$50M', 'employees': 500, 'founded': 1949, 'headquarters': 'Desert Southwest, USA', 'key_decision_makers': ['Wile E. Coyote - CEO', 'Jane Smith - CTO'], 'tech_stack': ['SAP', 'Salesforce', 'Custom ERP'], 'pain_points': ['Quality control at scale', 'Supply chain optimization'], 'competitors': ['ACME Rival Inc', 'RoadRunner Tech']},
                'tags': ['enterprise', 'manufacturing', 'high-value', 'innovation-focused'],
                'lead_score': 85,
                'status': 'qualified'
            },
            {
                'name': 'Beta LLC',
                'company': 'Beta Living LLC',
                'industry': 'Consumer Goods',
                'company_size': 'smb',
                'email': 'hello@betallc.com',
                'phone': '+1-555-0102',
                'website': 'https://www.betallc.com',
                'description': 'Specializes in eco-friendly home products, strong community presence.',
                'preferences': {'communication': 'phone', 'meeting_time': 'afternoon', 'interests': ['sustainability', 'community', 'eco-friendly']},
                'interaction_history': [
                    {'date': '2024-03-10', 'type': 'call', 'summary': 'Discussed eco-friendly packaging solutions'}
                ],
                'customer_360_data': {'annual_revenue': '$5M', 'employees': 50, 'founded': 2015, 'headquarters': 'Portland, OR', 'key_decision_makers': ['Sarah Green - Founder', 'Mike Chen - COO'], 'tech_stack': ['Shopify', 'HubSpot'], 'pain_points': ['Scaling sustainably', 'Brand differentiation'], 'competitors': ['EcoHome Inc', 'GreenLiving Co']},
                'tags': ['smb', 'eco-friendly', 'community-driven'],
                'lead_score': 65,
                'status': 'lead'
            },
            {
                'name': 'Gamma Tech',
                'company': 'Gamma Technologies Inc',
                'industry': 'Technology',
                'company_size': 'startup',
                'email': 'info@gammatech.io',
                'phone': '+1-555-0103',
                'website': 'https://www.gammatech.io',
                'description': 'Emerging startup in AI-driven logistics software. Focuses on automation and scalability for e-commerce.',
                'preferences': {'communication': 'slack', 'meeting_time': 'flexible', 'interests': ['AI', 'automation', 'logistics', 'scalability']},
                'interaction_history': [
                    {'date': '2024-04-05', 'type': 'meeting', 'summary': 'Technical deep dive on AI integration capabilities'}
                ],
                'customer_360_data': {'annual_revenue': '$2M', 'employees': 25, 'founded': 2022, 'headquarters': 'San Francisco, CA', 'key_decision_makers': ['Alex Kumar - CEO/CTO', 'Lisa Wang - VP Engineering'], 'tech_stack': ['AWS', 'Python', 'React', 'Kubernetes'], 'pain_points': ['Scaling infrastructure', 'Customer acquisition'], 'competitors': ['LogiAI', 'ShipSmart']},
                'tags': ['startup', 'AI', 'high-growth', 'tech-savvy'],
                'lead_score': 72,
                'status': 'prospect'
            },
            {
                'name': 'Delta Foods',
                'company': 'Delta Foods Inc',
                'industry': 'Food & Beverage',
                'company_size': 'smb',
                'email': 'contact@deltafoods.com',
                'phone': '+1-555-0104',
                'website': 'https://www.deltafoods.com',
                'description': 'Family-owned organic food producer emphasizing sustainable farming and direct-to-consumer sales.',
                'preferences': {'communication': 'email', 'meeting_time': 'morning', 'interests': ['organic', 'sustainability', 'D2C', 'farming']},
                'interaction_history': [
                    {'date': '2024-02-20', 'type': 'email', 'summary': 'Inquiry about D2C platform capabilities'},
                    {'date': '2024-03-15', 'type': 'call', 'summary': 'Follow-up on supply chain features'}
                ],
                'customer_360_data': {'annual_revenue': '$8M', 'employees': 75, 'founded': 1998, 'headquarters': 'Vermont, USA', 'key_decision_makers': ['Tom Delta - Owner', 'Mary Delta - Operations Director'], 'tech_stack': ['QuickBooks', 'Mailchimp', 'Basic WordPress site'], 'pain_points': ['Digital transformation', 'Online sales scaling', 'Inventory management'], 'competitors': ['Organic Valley', 'Local Harvest']},
                'tags': ['smb', 'organic', 'family-owned', 'D2C'],
                'lead_score': 78,
                'status': 'qualified'
            },
            {
                'name': 'Epsilon Media',
                'company': 'Epsilon Media Group',
                'industry': 'Marketing & Advertising',
                'company_size': 'mid-market',
                'email': 'partnerships@epsilonmedia.com',
                'phone': '+1-555-0105',
                'website': 'https://www.epsilonmedia.com',
                'description': 'Digital marketing agency with expertise in social media campaigns and content creation for B2B clients.',
                'preferences': {'communication': 'email', 'meeting_time': 'afternoon', 'interests': ['B2B marketing', 'content creation', 'social media', 'analytics']},
                'interaction_history': [
                    {'date': '2024-01-25', 'type': 'meeting', 'summary': 'Partnership exploration meeting'},
                    {'date': '2024-02-15', 'type': 'email', 'summary': 'Sent partnership proposal'},
                    {'date': '2024-03-01', 'type': 'call', 'summary': 'Discussed integration opportunities'}
                ],
                'customer_360_data': {'annual_revenue': '$15M', 'employees': 120, 'founded': 2010, 'headquarters': 'New York, NY', 'key_decision_makers': ['Diana Ross - CEO', 'James Lee - VP Strategy', 'Karen White - CTO'], 'tech_stack': ['HubSpot', 'Hootsuite', 'Google Analytics', 'Salesforce'], 'pain_points': ['AI content generation', 'Campaign personalization at scale', 'ROI tracking'], 'competitors': ['Agency X', 'MediaPro']},
                'tags': ['mid-market', 'agency', 'B2B', 'partnership-potential'],
                'lead_score': 90,
                'status': 'customer'
            },
            {
                'name': 'Zeta Renewables',
                'company': 'Zeta Renewables Corp',
                'industry': 'Energy',
                'company_size': 'mid-market',
                'email': 'sales@zetarenewables.com',
                'phone': '+1-555-0106',
                'website': 'https://www.zetarenewables.com',
                'description': 'Provider of solar energy solutions for residential and commercial buildings. Committed to green energy transition.',
                'preferences': {'communication': 'email', 'meeting_time': 'morning', 'interests': ['solar energy', 'green tech', 'residential', 'commercial']},
                'interaction_history': [
                    {'date': '2024-05-10', 'type': 'email', 'summary': 'Initial contact about marketing solutions for solar products'}
                ],
                'customer_360_data': {'annual_revenue': '$25M', 'employees': 200, 'founded': 2016, 'headquarters': 'Austin, TX', 'key_decision_makers': ['Robert Zeta - CEO', 'Emily Solar - CMO'], 'tech_stack': ['Salesforce', 'Custom CRM', 'Google Workspace'], 'pain_points': ['Lead generation', 'Customer education', 'Market expansion'], 'competitors': ['SunPower', 'Tesla Solar']},
                'tags': ['mid-market', 'green-energy', 'growth-stage'],
                'lead_score': 70,
                'status': 'lead'
            }
        ]

        for data in customers_data:
            customer, created = Customer.objects.update_or_create(
                name=data['name'],
                defaults=data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} customer: {customer.name}')

    def seed_agent_configs(self):
        agents_data = [
            {
                'name': 'Research Agent',
                'agent_type': 'research',
                'description': 'Researches customer profiles, industry trends, and competitive landscape to provide comprehensive context for pitch generation.',
                'system_prompt': 'You are an expert market researcher. Analyze customer data, industry trends, and competitive landscapes to provide actionable insights for sales pitch creation.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.3,
                'max_tokens': 2000,
                'tools': ['research_customer', 'analyze_customer_sentiment', 'competitive_positioning', 'calculate_lead_score'],
                'is_active': True,
                'metadata': {'specialization': 'customer_research', 'avg_execution_time': 5.2}
            },
            {
                'name': 'Pitch Generator Agent',
                'agent_type': 'pitch_generator',
                'description': 'Generates personalized, compelling sales pitches based on customer research and configured parameters.',
                'system_prompt': 'You are an expert sales copywriter. Create persuasive, personalized sales pitches that resonate with the target customer. Focus on value proposition, customer pain points, and clear calls to action.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.7,
                'max_tokens': 3000,
                'tools': ['initial_pitch_prompt', 'generate_subject_line', 'pitch_ab_variants'],
                'is_active': True,
                'metadata': {'specialization': 'pitch_creation', 'avg_execution_time': 8.5}
            },
            {
                'name': 'Scoring Agent',
                'agent_type': 'scorer',
                'description': 'Evaluates pitch quality on persuasiveness, clarity, and relevance dimensions using structured criteria.',
                'system_prompt': 'You are a pitch evaluation expert. Score sales pitches objectively on persuasiveness, clarity, and relevance. Provide detailed reasoning for each score.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.1,
                'max_tokens': 1500,
                'tools': ['score_pitch'],
                'is_active': True,
                'metadata': {'specialization': 'quality_assessment', 'avg_execution_time': 3.1}
            },
            {
                'name': 'Refinement Agent',
                'agent_type': 'refiner',
                'description': 'Refines and improves pitches based on scoring feedback and user input to maximize effectiveness.',
                'system_prompt': 'You are an expert sales copywriter specializing in pitch refinement. Improve pitches based on specific feedback while maintaining the core message and personalization.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.5,
                'max_tokens': 3000,
                'tools': ['refine_pitch', 'generate_followup_sequence'],
                'is_active': True,
                'metadata': {'specialization': 'pitch_refinement', 'avg_execution_time': 6.7}
            },
            {
                'name': 'Strategy Agent',
                'agent_type': 'strategy',
                'description': 'Develops campaign strategies and recommends optimal approaches based on customer segments and market analysis.',
                'system_prompt': 'You are a marketing strategist. Develop comprehensive campaign strategies based on customer segments, market trends, and business objectives.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.6,
                'max_tokens': 4000,
                'tools': ['competitive_positioning', 'calculate_lead_score', 'analyze_customer_sentiment'],
                'is_active': True,
                'metadata': {'specialization': 'campaign_strategy', 'avg_execution_time': 10.3}
            },
            {
                'name': 'Orchestrator Agent',
                'agent_type': 'orchestrator',
                'description': 'Coordinates the multi-agent pipeline, delegating tasks to specialized agents and managing the A2A communication flow.',
                'system_prompt': 'You are the orchestrator of a multi-agent marketing pitch system. Coordinate research, generation, scoring, and refinement agents to produce optimal pitches.',
                'model_name': 'gpt-4o-mini',
                'temperature': 0.2,
                'max_tokens': 2000,
                'tools': [],
                'is_active': True,
                'metadata': {'specialization': 'orchestration', 'avg_execution_time': 25.0}
            }
        ]

        for data in agents_data:
            agent, created = AgentConfig.objects.update_or_create(
                name=data['name'],
                defaults=data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} agent: {agent.name}')

    def seed_pitch_templates(self):
        templates_data = [
            {
                'name': 'B2B Introduction Pitch',
                'description': 'Professional first-contact pitch for B2B prospects. Focuses on establishing credibility and identifying mutual value.',
                'template_content': 'Subject: Unlocking Growth for {{customer_name}} with {{product_name}}\n\nDear {{contact_name}},\n\nI hope this message finds you well. I\'m reaching out because {{company_name}} has been making impressive strides in {{industry}}, and I believe there\'s a compelling opportunity for us to collaborate.\n\nAt {{our_company}}, we specialize in {{our_specialty}}, and we\'ve helped companies like {{reference_customer}} achieve {{key_result}}.\n\nGiven your focus on {{customer_focus}}, I\'d love to explore how we can help {{customer_name}} {{desired_outcome}}.\n\nWould you be open to a brief 15-minute call this week?\n\nBest regards,\n{{sender_name}}',
                'industry': 'General',
                'pitch_type': 'initial',
                'variables': ['customer_name', 'product_name', 'contact_name', 'company_name', 'industry', 'our_company', 'our_specialty', 'reference_customer', 'key_result', 'customer_focus', 'desired_outcome', 'sender_name'],
                'usage_count': 45
            },
            {
                'name': 'Product Demo Follow-Up',
                'description': 'Follow-up pitch after a product demonstration. Reinforces key value points and pushes for next steps.',
                'template_content': 'Subject: Next Steps After Your {{product_name}} Demo\n\nHi {{contact_name}},\n\nThank you for taking the time to explore {{product_name}} with us yesterday. It was great to see your enthusiasm about {{feature_highlighted}}.\n\nAs we discussed, {{product_name}} can help {{customer_name}} address:\n- {{pain_point_1}}\n- {{pain_point_2}}\n- {{pain_point_3}}\n\nBased on your requirements, I\'ve put together a customized proposal that includes {{proposal_highlights}}.\n\nI\'d love to schedule a follow-up to walk through the details and answer any questions from your team.\n\nLooking forward to our next conversation!\n\nBest,\n{{sender_name}}',
                'industry': 'Technology',
                'pitch_type': 'refined',
                'variables': ['product_name', 'contact_name', 'feature_highlighted', 'customer_name', 'pain_point_1', 'pain_point_2', 'pain_point_3', 'proposal_highlights', 'sender_name'],
                'usage_count': 32
            },
            {
                'name': 'Renewal & Retention Pitch',
                'description': 'Pitch for existing customers approaching renewal. Emphasizes achieved value and upcoming enhancements.',
                'template_content': 'Subject: Your {{product_name}} Renewal + Exciting Updates for {{customer_name}}\n\nDear {{contact_name}},\n\nAs your {{product_name}} renewal approaches, I wanted to take a moment to reflect on the incredible results {{customer_name}} has achieved:\n\n📈 {{achievement_1}}\n💡 {{achievement_2}}\n🎯 {{achievement_3}}\n\nIn the coming year, we\'re rolling out {{upcoming_feature}}, which will help you {{future_benefit}}.\n\nAs a valued customer, we\'d like to offer {{renewal_incentive}} with your renewal.\n\nCan we schedule a quick call to discuss your renewal and how we can continue to support {{customer_name}}\'s growth?\n\nWarmly,\n{{sender_name}}',
                'industry': 'General',
                'pitch_type': 'initial',
                'variables': ['product_name', 'contact_name', 'customer_name', 'achievement_1', 'achievement_2', 'achievement_3', 'upcoming_feature', 'future_benefit', 'renewal_incentive', 'sender_name'],
                'usage_count': 18
            }
        ]

        for data in templates_data:
            template, created = PitchTemplate.objects.update_or_create(
                name=data['name'],
                defaults=data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} template: {template.name}')

    def seed_campaigns(self):
        # Get some customers for targets
        campaigns_data = [
            {
                'name': 'Q1 Tech Outreach',
                'description': 'First quarter outreach campaign targeting technology companies with AI-driven solutions.',
                'status': 'active',
                'campaign_type': 'email',
                'target_industry': 'Technology',
                'target_company_size': 'startup',
                'start_date': timezone.now().date() - timedelta(days=15),
                'end_date': timezone.now().date() + timedelta(days=75),
                'goals': {'target_responses': 50, 'target_conversions': 10, 'target_revenue': 500000},
                'budget': 25000.00,
                'metrics': {'emails_sent': 120, 'open_rate': 0.45, 'response_rate': 0.12, 'conversion_rate': 0.04}
            },
            {
                'name': 'Sustainability Partners Campaign',
                'description': 'Campaign targeting eco-conscious companies for partnership opportunities in sustainable solutions.',
                'status': 'draft',
                'campaign_type': 'multi-channel',
                'target_industry': 'Energy',
                'target_company_size': 'mid-market',
                'start_date': timezone.now().date() + timedelta(days=10),
                'end_date': timezone.now().date() + timedelta(days=100),
                'goals': {'target_responses': 30, 'target_conversions': 5, 'target_revenue': 300000},
                'budget': 15000.00,
                'metrics': {'emails_sent': 0, 'open_rate': 0.0, 'response_rate': 0.0, 'conversion_rate': 0.0}
            }
        ]

        for data in campaigns_data:
            campaign, created = Campaign.objects.update_or_create(
                name=data['name'],
                defaults=data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} campaign: {campaign.name}')

    def seed_dashboard_metrics(self):
        now = timezone.now()
        metrics_data = [
            {'name': 'total_customers', 'metric_type': 'counter', 'value': 6, 'period': 'daily', 'date': now.date()},
            {'name': 'total_pitches', 'metric_type': 'counter', 'value': 0, 'period': 'daily', 'date': now.date()},
            {'name': 'active_campaigns', 'metric_type': 'gauge', 'value': 1, 'period': 'daily', 'date': now.date()},
            {'name': 'avg_pitch_score', 'metric_type': 'gauge', 'value': 0, 'period': 'daily', 'date': now.date()},
            {'name': 'conversion_rate', 'metric_type': 'percentage', 'value': 0, 'period': 'weekly', 'date': now.date()},
            {'name': 'agent_efficiency', 'metric_type': 'percentage', 'value': 95.5, 'period': 'daily', 'date': now.date()},
        ]

        for data in metrics_data:
            metric, created = DashboardMetric.objects.update_or_create(
                name=data['name'],
                date=data['date'],
                period=data['period'],
                defaults=data
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} metric: {metric.name}')
