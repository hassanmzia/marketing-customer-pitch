"""
Seed default pitch templates for common use cases.
"""
from django.db import migrations


def create_default_templates(apps, schema_editor):
    PitchTemplate = apps.get_model('pitches', 'PitchTemplate')

    templates = [
        {
            'name': 'Cold Outreach - SaaS',
            'description': 'Initial outreach template for SaaS product pitches targeting new prospects.',
            'pitch_type': 'initial',
            'industry': 'Technology',
            'template_content': (
                'Subject: {company_name}, meet your new {product_category} solution\n\n'
                'Hi {contact_name},\n\n'
                'I noticed that {company_name} is growing fast in the {industry} space. '
                'Companies at your stage often face challenges with {pain_point}.\n\n'
                'We help teams like yours {value_proposition}. In fact, our customers '
                'typically see {key_metric} within {timeframe}.\n\n'
                'Would you be open to a quick 15-minute call this week to explore '
                'how we could help {company_name} {desired_outcome}?\n\n'
                'Best,\n{sender_name}'
            ),
            'variables': [
                'company_name', 'contact_name', 'industry', 'pain_point',
                'product_category', 'value_proposition', 'key_metric',
                'timeframe', 'desired_outcome', 'sender_name',
            ],
        },
        {
            'name': 'Follow-Up After Demo',
            'description': 'Follow-up template to send after a product demonstration.',
            'pitch_type': 'follow_up',
            'industry': '',
            'template_content': (
                'Subject: Next steps after our demo, {contact_name}\n\n'
                'Hi {contact_name},\n\n'
                'Thanks for taking the time to see {product_name} in action yesterday. '
                'I enjoyed learning about {company_name}\'s goals around {discussed_topic}.\n\n'
                'As discussed, here\'s a recap of how we can help:\n\n'
                '- {benefit_1}\n'
                '- {benefit_2}\n'
                '- {benefit_3}\n\n'
                'I\'ve attached {resource} for your review. '
                '{next_step}\n\n'
                'Looking forward to hearing your thoughts.\n\n'
                'Best,\n{sender_name}'
            ),
            'variables': [
                'contact_name', 'company_name', 'product_name', 'discussed_topic',
                'benefit_1', 'benefit_2', 'benefit_3', 'resource',
                'next_step', 'sender_name',
            ],
        },
        {
            'name': 'Product Demo Request',
            'description': 'Template for inviting prospects to a personalized product demonstration.',
            'pitch_type': 'product_demo',
            'industry': '',
            'template_content': (
                'Subject: See how {product_name} solves {pain_point} — personalized demo\n\n'
                'Hi {contact_name},\n\n'
                'I\'ve been following {company_name}\'s work in {industry} and I believe '
                'we can help you tackle {pain_point}.\n\n'
                '{product_name} is designed to {value_proposition}. '
                'I\'d love to show you a demo tailored to {company_name}\'s specific needs.\n\n'
                'Here are a few times that work for me this week:\n'
                '- {time_slot_1}\n'
                '- {time_slot_2}\n'
                '- {time_slot_3}\n\n'
                'Or feel free to pick a time here: {calendar_link}\n\n'
                'Best,\n{sender_name}'
            ),
            'variables': [
                'contact_name', 'company_name', 'industry', 'pain_point',
                'product_name', 'value_proposition', 'time_slot_1',
                'time_slot_2', 'time_slot_3', 'calendar_link', 'sender_name',
            ],
        },
        {
            'name': 'Renewal Offer',
            'description': 'Template for customer renewal and retention outreach.',
            'pitch_type': 'renewal',
            'industry': '',
            'template_content': (
                'Subject: Your {product_name} renewal — exclusive offer inside\n\n'
                'Hi {contact_name},\n\n'
                'Your {product_name} subscription is coming up for renewal on {renewal_date}. '
                'Over the past {period}, your team has achieved some great results:\n\n'
                '- {achievement_1}\n'
                '- {achievement_2}\n'
                '- {achievement_3}\n\n'
                'We\'d love to keep this momentum going. As a valued customer, '
                'we\'re offering {renewal_offer} when you renew before {deadline}.\n\n'
                '{additional_incentive}\n\n'
                'Want to discuss your renewal options? I\'m happy to set up a quick call.\n\n'
                'Best,\n{sender_name}'
            ),
            'variables': [
                'contact_name', 'product_name', 'renewal_date', 'period',
                'achievement_1', 'achievement_2', 'achievement_3',
                'renewal_offer', 'deadline', 'additional_incentive', 'sender_name',
            ],
        },
        {
            'name': 'Enterprise Solution Pitch',
            'description': 'Comprehensive pitch template for enterprise-level prospects with complex needs.',
            'pitch_type': 'initial',
            'industry': '',
            'template_content': (
                'Subject: A strategic approach to {business_challenge} for {company_name}\n\n'
                'Dear {contact_name},\n\n'
                'As {contact_title} at {company_name}, you\'re likely focused on {strategic_goal}. '
                'Many enterprise leaders in {industry} are facing similar challenges around {pain_point}.\n\n'
                'At {our_company}, we\'ve helped organizations like {reference_customer_1} and '
                '{reference_customer_2} achieve:\n\n'
                '- {result_1}\n'
                '- {result_2}\n'
                '- {result_3}\n\n'
                'Our approach is built around {differentiator}, ensuring {key_benefit}.\n\n'
                'I\'d welcome the opportunity to discuss how we could support '
                '{company_name}\'s objectives. Would {proposed_date} work for an introductory conversation?\n\n'
                'Regards,\n{sender_name}\n{sender_title}'
            ),
            'variables': [
                'contact_name', 'contact_title', 'company_name', 'industry',
                'business_challenge', 'strategic_goal', 'pain_point',
                'our_company', 'reference_customer_1', 'reference_customer_2',
                'result_1', 'result_2', 'result_3', 'differentiator',
                'key_benefit', 'proposed_date', 'sender_name', 'sender_title',
            ],
        },
        {
            'name': 'Healthcare Compliance Pitch',
            'description': 'Specialized pitch for healthcare organizations emphasizing compliance and security.',
            'pitch_type': 'initial',
            'industry': 'Healthcare',
            'template_content': (
                'Subject: HIPAA-compliant {product_category} for {company_name}\n\n'
                'Hi {contact_name},\n\n'
                'Managing {pain_point} while maintaining strict compliance standards '
                'is one of the biggest challenges in healthcare today.\n\n'
                '{product_name} was built from the ground up with healthcare in mind:\n\n'
                '- HIPAA-compliant and SOC 2 certified\n'
                '- {feature_1}\n'
                '- {feature_2}\n'
                '- {feature_3}\n\n'
                'We currently work with {customer_count}+ healthcare organizations, '
                'including {reference_customer}.\n\n'
                'Would you be interested in seeing how {product_name} could help '
                '{company_name} {desired_outcome}?\n\n'
                'Best,\n{sender_name}'
            ),
            'variables': [
                'contact_name', 'company_name', 'pain_point', 'product_category',
                'product_name', 'feature_1', 'feature_2', 'feature_3',
                'customer_count', 'reference_customer', 'desired_outcome', 'sender_name',
            ],
        },
        {
            'name': 'Financial Services Pitch',
            'description': 'Pitch template tailored for financial services firms emphasizing ROI and security.',
            'pitch_type': 'initial',
            'industry': 'Finance',
            'template_content': (
                'Subject: How {product_name} drives ROI for firms like {company_name}\n\n'
                'Hi {contact_name},\n\n'
                'In today\'s market, financial services firms need to {strategic_need} '
                'without compromising on security or compliance.\n\n'
                '{product_name} helps firms like yours:\n\n'
                '- Reduce {cost_area} by {percentage}\n'
                '- {benefit_1}\n'
                '- {benefit_2}\n\n'
                'Our platform meets {compliance_standard} requirements and integrates '
                'with {integration_list}.\n\n'
                'I\'d be happy to walk you through a case study showing how '
                '{reference_customer} achieved {key_result}.\n\n'
                'Best regards,\n{sender_name}'
            ),
            'variables': [
                'contact_name', 'company_name', 'product_name', 'strategic_need',
                'cost_area', 'percentage', 'benefit_1', 'benefit_2',
                'compliance_standard', 'integration_list', 'reference_customer',
                'key_result', 'sender_name',
            ],
        },
    ]

    for tmpl in templates:
        PitchTemplate.objects.create(**tmpl)


def remove_default_templates(apps, schema_editor):
    PitchTemplate = apps.get_model('pitches', 'PitchTemplate')
    PitchTemplate.objects.filter(name__in=[
        'Cold Outreach - SaaS',
        'Follow-Up After Demo',
        'Product Demo Request',
        'Renewal Offer',
        'Enterprise Solution Pitch',
        'Healthcare Compliance Pitch',
        'Financial Services Pitch',
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pitches', '0002_add_pitch_type_choices'),
    ]

    operations = [
        migrations.RunPython(create_default_templates, remove_default_templates),
    ]
