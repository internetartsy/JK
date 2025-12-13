"""add_parcel_id_to_land_parcel

Revision ID: add_parcel_id_001
Revises: 
Create Date: 2024-12-12 22:54:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_parcel_id_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add parcel_id column
    op.add_column('land_parcel', 
        sa.Column('parcel_id', sa.String(length=14), nullable=True)
    )
    
    # Create unique index
    op.create_index(
        'ix_land_parcel_parcel_id',
        'land_parcel',
        ['parcel_id'],
        unique=True
    )
    
    # Note: Run a data migration script separately to populate existing records
    # Then change nullable=False


def downgrade():
    op.drop_index('ix_land_parcel_parcel_id', table_name='land_parcel')
    op.drop_column('land_parcel', 'parcel_id')
