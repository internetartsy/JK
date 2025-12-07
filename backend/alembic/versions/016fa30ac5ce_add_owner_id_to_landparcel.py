"""add_owner_id_to_landparcel

Revision ID: 016fa30ac5ce
Revises: ea6afb513648
Create Date: 2025-12-07 06:59:50.870444

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '016fa30ac5ce'
down_revision = 'ea6afb513648'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('landparcel', sa.Column('owner_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_landparcel_owner_id'), 'landparcel', ['owner_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_landparcel_owner_id'), table_name='landparcel')
    op.drop_column('landparcel', 'owner_id')
