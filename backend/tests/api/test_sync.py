"""
API tests for sync endpoints.
"""

import pytest
from fastapi import status


class TestSyncBatch:
    """Tests for /sync/batch endpoint"""

    def test_batch_upsert_creates_parcel(self, client, auth_headers, sample_parcel):
        """Test creating a new parcel via batch upsert"""
        response = client.post(
            "/api/v1/sync/batch",
            json={"parcels": [sample_parcel], "persons": []},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert sample_parcel["id"] in data["synced_parcels"]
        assert len(data["errors"]) == 0

    def test_batch_upsert_creates_person(self, client, auth_headers, sample_person):
        """Test creating a new person via batch upsert"""
        response = client.post(
            "/api/v1/sync/batch",
            json={"parcels": [], "persons": [sample_person]},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert sample_person["id"] in data["synced_persons"]
        assert len(data["errors"]) == 0

    def test_batch_upsert_updates_existing_parcel(self, client, auth_headers, sample_parcel):
        """Test updating an existing parcel increases version"""
        # First create
        client.post(
            "/api/v1/sync/batch",
            json={"parcels": [sample_parcel], "persons": []},
            headers=auth_headers
        )
        
        # Then update
        updated_parcel = {**sample_parcel, "area_text": "10 کنال"}
        response = client.post(
            "/api/v1/sync/batch",
            json={"parcels": [updated_parcel], "persons": []},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert sample_parcel["id"] in data["synced_parcels"]

    def test_batch_upsert_missing_id_returns_error(self, client, auth_headers):
        """Test that missing ID returns an error"""
        invalid_parcel = {"khasra_number": "123", "village_id": "v1"}
        
        response = client.post(
            "/api/v1/sync/batch",
            json={"parcels": [invalid_parcel], "persons": []},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["errors"]) == 1
        assert data["errors"][0]["error"] == "Missing ID"


class TestSyncChanges:
    """Tests for /sync/changes endpoint"""

    def test_get_changes_returns_recent_parcels(self, client, auth_headers, sample_parcel):
        """Test getting changes returns recently modified parcels"""
        # Create a parcel first
        client.post(
            "/api/v1/sync/batch",
            json={"parcels": [sample_parcel], "persons": []},
            headers=auth_headers
        )
        
        # Get changes from yesterday
        response = client.get(
            "/api/v1/sync/changes?since=2020-01-01T00:00:00",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["parcels"]) >= 1
        assert any(p["id"] == sample_parcel["id"] for p in data["parcels"])

    def test_get_changes_empty_for_future_date(self, client, auth_headers):
        """Test getting changes with future date returns empty"""
        response = client.get(
            "/api/v1/sync/changes?since=2099-01-01T00:00:00",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["parcels"]) == 0
        assert len(data["persons"]) == 0


class TestConflictCheck:
    """Tests for /sync/conflict/check endpoint"""

    def test_conflict_check_detects_field_changes(self, client, auth_headers, sample_parcel):
        """Test conflict check detects changes between versions"""
        # Create parcel on server
        client.post(
            "/api/v1/sync/batch",
            json={"parcels": [sample_parcel], "persons": []},
            headers=auth_headers
        )
        
        # Check for conflicts with modified local version
        local_version = {**sample_parcel, "area_text": "Modified locally"}
        response = client.post(
            "/api/v1/sync/conflict/check",
            json={
                "entity_type": "parcel",
                "entity_id": sample_parcel["id"],
                "base_version": sample_parcel,
                "local_version": local_version
            },
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["entity_id"] == sample_parcel["id"]
        assert "field_diffs" in data

    def test_conflict_check_parcel_not_found(self, client, auth_headers):
        """Test conflict check returns 404 for non-existent parcel"""
        response = client.post(
            "/api/v1/sync/conflict/check",
            json={
                "entity_type": "parcel",
                "entity_id": "non-existent-id",
                "base_version": {},
                "local_version": {}
            },
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestHealthcheck:
    """Tests for health endpoints"""

    def test_root_returns_welcome(self, client):
        """Test root endpoint returns welcome message"""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.json()

    def test_health_check_returns_ok(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "ok"

    def test_metrics_endpoint_exists(self, client):
        """Test metrics endpoint returns prometheus format"""
        response = client.get("/metrics")
        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers.get("content-type", "") or \
               "text/html" in response.headers.get("content-type", "")
