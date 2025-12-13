"""add_aadhaar_consent_and_ror

Revision ID: aadhaar_consent_001
Revises: add_parcel_id_001
Create Date: 2024-12-12 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'aadhaar_consent_001'
down_revision = 'add_parcel_id_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create RoR (Record of Rights) table
    op.create_table(
        'record_of_rights',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ulpin', sa.String(14), sa.ForeignKey('landparcel.parcel_id'), nullable=False, index=True),
        sa.Column('ror_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('khewat_number', sa.String(50)),
        sa.Column('khatoni_number', sa.String(50)),
        sa.Column('khasra_numbers', postgresql.ARRAY(sa.String)),  # Multiple khasras
        sa.Column('owner_names', postgresql.JSONB),  # List of owners
        sa.Column('total_area', sa.Float),
        sa.Column('cultivable_area', sa.Float),
        sa.Column('irrigation_status', sa.String(50)),
        sa.Column('land_type', sa.String(50)),
        sa.Column('revenue_village', sa.String(100)),
        sa.Column('tehsil', sa.String(100)),
        sa.Column('district', sa.String(100)),
        sa.Column('mutation_number', sa.String(50)),
        sa.Column('mutation_date', sa.Date),
        sa.Column('verified', sa.Boolean, default=False),
        sa.Column('verified_by', sa.String),
        sa.Column('verified_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create Aadhaar Consent table
    op.create_table(
        'aadhaar_consent',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('person.id'), nullable=False, index=True),
        sa.Column('aadhaar_hash', sa.String(64), nullable=False, index=True),  # SHA-256 hash
        sa.Column('aadhaar_last_4', sa.String(4)),  # Last 4 digits for display
        sa.Column('consent_given', sa.Boolean, default=False),
        sa.Column('consent_timestamp', sa.DateTime),
        sa.Column('consent_ip_address', sa.String(45)),
        sa.Column('consent_device_info', sa.String),
        sa.Column('consent_purpose', sa.String),  # e.g., "PM-KISAN enrollment"
        sa.Column('consent_expires_at', sa.DateTime),
        sa.Column('consent_revoked', sa.Boolean, default=False),
        sa.Column('consent_revoked_at', sa.DateTime),
        sa.Column('aadhaar_verified', sa.Boolean, default=False),
        sa.Column('aadhaar_verified_at', sa.DateTime),
        sa.Column('aadhaar_verification_method', sa.String),  # OTP, Biometric, etc.
        sa.Column('linked_rors', postgresql.ARRAY(sa.String)),  # Array of RoR numbers
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create ULPIN-Farmer-RoR linkage table
    op.create_table(
        'ulpin_farmer_ror_link',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ulpin', sa.String(14), sa.ForeignKey('landparcel.parcel_id'), nullable=False, index=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('person.id'), nullable=False, index=True),
        sa.Column('ror_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('record_of_rights.id'), nullable=False, index=True),
        sa.Column('ownership_type', sa.String(50)),  # Owner, Co-owner, Tenant, etc.
        sa.Column('ownership_share', sa.Float),  # Percentage or area
        sa.Column('validated', sa.Boolean, default=False),
        sa.Column('validated_by', sa.String),
        sa.Column('validated_at', sa.DateTime),
        sa.Column('validation_method', sa.String),  # Aadhaar+RoR, Manual, etc.
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('remarks', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create unique constraint for farmer-ror link
    op.create_unique_constraint(
        'uq_farmer_ror_ulpin',
        'ulpin_farmer_ror_link',
        ['farmer_id', 'ror_id', 'ulpin']
    )
    
    # Create indexes
    op.create_index('ix_ror_ulpin', 'record_of_rights', ['ulpin'])
    op.create_index('ix_aadhaar_farmer', 'aadhaar_consent', ['farmer_id'])
    op.create_index('ix_aadhaar_hash', 'aadhaar_consent', ['aadhaar_hash'])
    op.create_index('ix_link_validated', 'ulpin_farmer_ror_link', ['validated'])


def downgrade():
    op.drop_table('ulpin_farmer_ror_link')
    op.drop_table('aadhaar_consent')
    op.drop_table('record_of_rights')
