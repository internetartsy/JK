"""
Tests for conflict resolution service.
"""

import pytest
from app.services.sync.conflict_resolution import (
    ConflictResolutionService,
    ResolutionStrategy,
    FieldDiff,
    ConflictReport
)


class TestConflictResolutionService:
    """Tests for 3-way merge conflict resolution"""

    @pytest.fixture
    def service(self):
        return ConflictResolutionService()

    @pytest.fixture
    def base_parcel(self):
        return {
            "id": "parcel-001",
            "khasra_number": "100",
            "village_id": "village-1",
            "area_text": "5 کنال",
            "status": "active",
            "version": 1
        }

    def test_no_conflict_when_unchanged(self, service, base_parcel):
        """Test no conflict when all versions are the same"""
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=base_parcel,
            server=base_parcel
        )
        
        assert not result.has_conflicts
        assert result.can_auto_merge

    def test_local_only_change_no_conflict(self, service, base_parcel):
        """Test local-only change does not create conflict"""
        local = {**base_parcel, "area_text": "10 کنال"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=local,
            server=base_parcel
        )
        
        assert not result.has_conflicts
        # Find the area_text diff
        area_diff = next(d for d in result.field_diffs if d.field_name == "area_text")
        assert area_diff.suggested_resolution == ResolutionStrategy.USE_LOCAL
        assert area_diff.merged_value == "10 کنال"

    def test_server_only_change_no_conflict(self, service, base_parcel):
        """Test server-only change does not create conflict"""
        server = {**base_parcel, "village_id": "village-2"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=base_parcel,
            server=server
        )
        
        assert not result.has_conflicts
        village_diff = next(d for d in result.field_diffs if d.field_name == "village_id")
        assert village_diff.suggested_resolution == ResolutionStrategy.USE_SERVER
        assert village_diff.merged_value == "village-2"

    def test_both_change_same_value_no_conflict(self, service, base_parcel):
        """Test both changing to same value is not a conflict"""
        modified = {**base_parcel, "status": "inactive"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=modified,
            server=modified
        )
        
        assert not result.has_conflicts
        status_diff = next(d for d in result.field_diffs if d.field_name == "status")
        assert status_diff.suggested_resolution == ResolutionStrategy.AUTO_MERGE

    def test_conflict_when_both_change_different(self, service, base_parcel):
        """Test conflict when both change to different values"""
        local = {**base_parcel, "khasra_number": "101"}
        server = {**base_parcel, "khasra_number": "102"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=local,
            server=server
        )
        
        assert result.has_conflicts
        khasra_diff = next(d for d in result.field_diffs if d.field_name == "khasra_number")
        assert khasra_diff.has_conflict
        assert khasra_diff.local_value == "101"
        assert khasra_diff.server_value == "102"

    def test_consent_flags_auto_merge(self, service):
        """Test consent flags can be auto-merged (union)"""
        base = {
            "id": "person-001",
            "consent_flags": {"photo": True}
        }
        local = {
            "id": "person-001",
            "consent_flags": {"photo": True, "data_collection": True}
        }
        server = {
            "id": "person-001",
            "consent_flags": {"photo": True, "marketing": False}
        }
        
        result = service.compute_diff(
            entity_type="person",
            base=base,
            local=local,
            server=server
        )
        
        # Consent flags should be auto-merged
        consent_diff = next(
            (d for d in result.field_diffs if d.field_name == "consent_flags"),
            None
        )
        if consent_diff:
            assert consent_diff.suggested_resolution == ResolutionStrategy.AUTO_MERGE

    def test_local_preferred_fields(self, service, base_parcel):
        """Test area_text uses local by default on conflict"""
        local = {**base_parcel, "area_text": "Local edit"}
        server = {**base_parcel, "area_text": "Server edit"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=local,
            server=server
        )
        
        area_diff = next(d for d in result.field_diffs if d.field_name == "area_text")
        assert area_diff.has_conflict
        # Local-preferred field should suggest USE_LOCAL
        assert area_diff.suggested_resolution == ResolutionStrategy.USE_LOCAL

    def test_server_preferred_fields(self, service, base_parcel):
        """Test village_id uses server by default on conflict"""
        local = {**base_parcel, "village_id": "local-village"}
        server = {**base_parcel, "village_id": "server-village"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=local,
            server=server
        )
        
        village_diff = next(d for d in result.field_diffs if d.field_name == "village_id")
        assert village_diff.has_conflict
        # Server-preferred field should suggest USE_SERVER
        assert village_diff.suggested_resolution == ResolutionStrategy.USE_SERVER

    def test_suggested_merged_entity(self, service, base_parcel):
        """Test suggested merged entity combines non-conflicting changes"""
        local = {**base_parcel, "area_text": "Local area"}
        server = {**base_parcel, "status": "verified"}
        
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=local,
            server=server
        )
        
        merged = result.suggested_merged_entity
        assert merged["area_text"] == "Local area"  # Local change accepted
        assert merged["status"] == "verified"  # Server change accepted
        assert merged["version"] > base_parcel["version"]  # Version bumped

    def test_to_dict_serialization(self, service, base_parcel):
        """Test conflict report can be serialized to dict"""
        result = service.compute_diff(
            entity_type="parcel",
            base=base_parcel,
            local=base_parcel,
            server=base_parcel
        )
        
        data = result.to_dict()
        assert isinstance(data, dict)
        assert data["entity_type"] == "parcel"
        assert "field_diffs" in data
        assert "suggested_merged_entity" in data
