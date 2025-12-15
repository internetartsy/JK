"""merge_parcel_id_branch

Revision ID: da34b078f86a
Revises: 016fa30ac5ce, add_parcel_id_001
Create Date: 2025-12-12 17:29:36.587355

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'da34b078f86a'
down_revision = ('016fa30ac5ce', 'add_parcel_id_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
