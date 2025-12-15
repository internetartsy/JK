"""merge_aadhaar_consent

Revision ID: a6cf8df2891e
Revises: aadhaar_consent_001, da34b078f86a
Create Date: 2025-12-12 18:18:38.215395

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a6cf8df2891e'
down_revision = ('aadhaar_consent_001', 'da34b078f86a')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
