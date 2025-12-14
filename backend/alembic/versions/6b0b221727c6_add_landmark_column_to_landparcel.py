"""add_landmark_column_to_landparcel

Revision ID: 6b0b221727c6
Revises: a6cf8df2891e
Create Date: 2025-12-14 01:34:40.120318

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6b0b221727c6'
down_revision = 'a6cf8df2891e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add landmark column to landparcel table
    op.add_column('landparcel', sa.Column('landmark', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove landmark column from landparcel table
    op.drop_column('landparcel', 'landmark')
