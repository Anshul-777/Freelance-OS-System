"""Add profile and settings fields to User model

Revision ID: add_profile_settings
Revises: 20260418_enhance_invoicing
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_profile_settings'
down_revision = '20260418_enhance_invoicing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile card template field
    op.add_column('users', sa.Column('profile_card_template', sa.String(50), nullable=True))
    
    # Add preference fields
    op.add_column('users', sa.Column('theme', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('language', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('date_format', sa.String(20), nullable=True))
    
    # Add notification preferences
    op.add_column('users', sa.Column('email_invoices', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('email_expenses', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('email_weekly', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('in_app_alerts', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('daily_digest', sa.Boolean(), nullable=False, server_default='true'))
    
    # Add privacy settings
    op.add_column('users', sa.Column('profile_public', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('show_email', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('show_location', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('show_activity', sa.Boolean(), nullable=False, server_default='true'))
    
    # Add API key field
    op.add_column('users', sa.Column('api_key', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'api_key')
    op.drop_column('users', 'show_activity')
    op.drop_column('users', 'show_location')
    op.drop_column('users', 'show_email')
    op.drop_column('users', 'profile_public')
    op.drop_column('users', 'daily_digest')
    op.drop_column('users', 'in_app_alerts')
    op.drop_column('users', 'email_weekly')
    op.drop_column('users', 'email_expenses')
    op.drop_column('users', 'email_invoices')
    op.drop_column('users', 'date_format')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'language')
    op.drop_column('users', 'theme')
    op.drop_column('users', 'profile_card_template')
