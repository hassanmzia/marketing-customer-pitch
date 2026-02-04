"""
Add follow_up, product_demo, and renewal to Pitch.pitch_type choices.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pitches', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pitch',
            name='pitch_type',
            field=models.CharField(
                choices=[
                    ('initial', 'Initial'),
                    ('follow_up', 'Follow-up'),
                    ('product_demo', 'Product Demo'),
                    ('renewal', 'Renewal'),
                    ('refined', 'Refined'),
                    ('final', 'Final'),
                    ('ab_variant', 'A/B Variant'),
                ],
                default='initial',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='pitchtemplate',
            name='pitch_type',
            field=models.CharField(
                choices=[
                    ('initial', 'Initial'),
                    ('follow_up', 'Follow-up'),
                    ('product_demo', 'Product Demo'),
                    ('renewal', 'Renewal'),
                    ('refined', 'Refined'),
                    ('final', 'Final'),
                    ('ab_variant', 'A/B Variant'),
                ],
                default='initial',
                max_length=20,
            ),
        ),
    ]
