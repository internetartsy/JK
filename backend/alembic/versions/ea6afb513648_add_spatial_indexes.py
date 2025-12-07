"""add_spatial_indexes

Revision ID: ea6afb513648
Revises: 2e22e7d50490
Create Date: 2025-12-07 06:06:59.158812

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ea6afb513648'
down_revision = '2e22e7d50490'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create GIST index on landparcel geometry
    op.create_index('idx_landparcel_geometry', 'landparcel', ['geometry'], postgresql_using='gist', if_not_exists=True)


def downgrade() -> None:
    op.drop_index('idx_landparcel_geometry', table_name='landparcel')
