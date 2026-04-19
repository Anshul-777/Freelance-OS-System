"""Enhance invoicing system with email tracking, payment history, and templates

Revision ID: 20260418_enhance_invoicing
Revises: 815d41aaff78
Create Date: 2026-04-18 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260418_enhance_invoicing'
down_revision: Union[str, Sequence[str], None] = '815d41aaff78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to invoices table
    op.add_column('invoices', sa.Column('email_delivery_status', sa.String(length=20), nullable=True))
    op.add_column('invoices', sa.Column('email_failure_reason', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('last_email_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('email_send_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('invoices', sa.Column('amount_paid', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0.0'))
    op.add_column('invoices', sa.Column('payment_notes', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('next_reminder_date', sa.Date(), nullable=True))
    op.add_column('invoices', sa.Column('is_from_template', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('invoices', sa.Column('template_invoice_id', sa.Integer(), nullable=True))
    
    # Add foreign key for template_invoice_id (self-referencing)
    op.create_foreign_key('fk_invoices_template_invoice_id', 'invoices', 'invoices', ['template_invoice_id'], ['id'])
    
    # Create invoice_events table
    op.create_table('invoice_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id']),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_invoice_events_id', 'invoice_events', ['id'], unique=False)
    op.create_index('ix_invoice_events_invoice_id', 'invoice_events', ['invoice_id'], unique=False)
    
    # Create invoice_templates table
    op.create_table('invoice_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_tax_rate', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.0'),
        sa.Column('default_discount', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0.0'),
        sa.Column('default_payment_terms', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_invoice_templates_id', 'invoice_templates', ['id'], unique=False)
    
    # Create invoice_template_items table
    op.create_table('invoice_template_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False, server_default='1.0'),
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['invoice_templates.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_invoice_template_items_id', 'invoice_template_items', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop invoice_template_items
    op.drop_index('ix_invoice_template_items_id', table_name='invoice_template_items')
    op.drop_table('invoice_template_items')
    
    # Drop invoice_templates
    op.drop_index('ix_invoice_templates_id', table_name='invoice_templates')
    op.drop_table('invoice_templates')
    
    # Drop invoice_events
    op.drop_index('ix_invoice_events_invoice_id', table_name='invoice_events')
    op.drop_index('ix_invoice_events_id', table_name='invoice_events')
    op.drop_table('invoice_events')
    
    # Drop new columns from invoices
    op.drop_constraint('fk_invoices_template_invoice_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'template_invoice_id')
    op.drop_column('invoices', 'is_from_template')
    op.drop_column('invoices', 'next_reminder_date')
    op.drop_column('invoices', 'reminder_sent_at')
    op.drop_column('invoices', 'payment_notes')
    op.drop_column('invoices', 'amount_paid')
    op.drop_column('invoices', 'email_send_attempts')
    op.drop_column('invoices', 'last_email_sent_at')
    op.drop_column('invoices', 'email_failure_reason')
    op.drop_column('invoices', 'email_delivery_status')
