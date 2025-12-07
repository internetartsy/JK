"""add_updated_at_column

Revision ID: d4974a925af6
Revises: 881e4d044162
Create Date: 2025-12-05 07:03:59.778330

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4974a925af6'
down_revision = '881e4d044162'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('landparcel', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('person', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Backfill updated_at with current timestamp
    op.execute("UPDATE landparcel SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE person SET updated_at = NOW() WHERE updated_at IS NULL")


def downgrade() -> None:
    op.drop_column('person', 'updated_at')
    op.drop_column('landparcel', 'updated_at')
