"""
Tests for the parcels API endpoints, including the new farmer stats endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.land_parcel import LandParcel
import uuid


class TestParcelsList:
    """Tests for GET /parcels/ endpoint"""
    
    def test_list_parcels_empty(self, client: TestClient, auth_headers):
        """Test listing parcels when database is empty"""
        response = client.get("/parcels/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_parcels_with_data(self, client: TestClient, auth_headers, db_session: Session):
        """Test listing parcels with sample data"""
        # Create test parcels
        parcels_data = [
            {
                "village_id": "village-1",
                "khasra_number": "123/1",
                "area_geom": 5.5,
                "owner_id": "farmer-1"
            },
            {
                "village_id": "village-1",
                "khasra_number": "123/2",
                "area_geom": 3.0,
                "owner_id": "farmer-2"
            },
            {
                "village_id": "village-2",
                "khasra_number": "456/1",
                "area_geom": 8.0,
                "owner_id": "farmer-1"
            }
        ]
        
        for data in parcels_data:
            parcel = LandParcel(
                id=str(uuid.uuid4()),
                **data
            )
            db_session.add(parcel)
        db_session.commit()
        
        # Test list
        response = client.get("/parcels/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
    
    def test_list_parcels_with_filter(self, client: TestClient, auth_headers, db_session: Session):
        """Test listing parcels with village_id filter"""
        # Create test data
        parcel1 = LandParcel(
            id=str(uuid.uuid4()),
            village_id="village-1",
            khasra_number="123/1",
            area_geom=5.5,
            owner_id="farmer-1"
        )
        parcel2 = LandParcel(
            id=str(uuid.uuid4()),
            village_id="village-2",
            khasra_number="456/1",
            area_geom=8.0,
            owner_id="farmer-2"
        )
        db_session.add_all([parcel1, parcel2])
        db_session.commit()
        
        # Test filter
        response = client.get("/parcels/?village_id=village-1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["village_id"] == "village-1"


class TestFarmerStats:
    """Tests for GET /parcels/stats/farmers endpoint"""
    
    def test_farmer_stats_empty(self, client: TestClient, auth_headers):
        """Test farmer stats when database is empty"""
        response = client.get("/parcels/stats/farmers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_farmers"] == 0
        assert data["total_parcels"] == 0
        assert data["avg_parcels_per_farmer"] == 0
    
    def test_farmer_stats_single_farmer(self, client: TestClient, auth_headers, db_session: Session):
        """Test farmer stats with one farmer owning multiple parcels"""
        # Create 3 parcels for same farmer
        for i in range(3):
            parcel = LandParcel(
                id=str(uuid.uuid4()),
                village_id="village-1",
                khasra_number=f"123/{i+1}",
                area_geom=5.0 + i,
                owner_id="farmer-1"
            )
            db_session.add(parcel)
        db_session.commit()
        
        response = client.get("/parcels/stats/farmers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_farmers"] == 1
        assert data["total_parcels"] == 3
        assert data["avg_parcels_per_farmer"] == 3.0
    
    def test_farmer_stats_multiple_farmers(self, client: TestClient, auth_headers, db_session: Session):
        """Test farmer stats with multiple farmers"""
        # Create 5 parcels for 2 farmers
        # Farmer 1: 3 parcels
        for i in range(3):
            parcel = LandParcel(
                id=str(uuid.uuid4()),
                village_id="village-1",
                khasra_number=f"123/{i+1}",
                area_geom=5.0,
                owner_id="farmer-1"
            )
            db_session.add(parcel)
        
        # Farmer 2: 2 parcels
        for i in range(2):
            parcel = LandParcel(
                id=str(uuid.uuid4()),
                village_id="village-2",
                khasra_number=f"456/{i+1}",
                area_geom=5.0,
                owner_id="farmer-2"
            )
            db_session.add(parcel)
        db_session.commit()
        
        response = client.get("/parcels/stats/farmers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_farmers"] == 2
        assert data["total_parcels"] == 5
        assert data["avg_parcels_per_farmer"] == 2.5
    
    def test_farmer_stats_ignores_null_owners(self, client: TestClient, auth_headers, db_session: Session):
        """Test that parcels with null owner_id are not counted as farmers"""
        # Create parcels: 2 with owner_id, 2 without
        parcel1 = LandParcel(
            id=str(uuid.uuid4()),
            village_id="village-1",
            khasra_number="123/1",
            area_geom=5.0,
            owner_id="farmer-1"
        )
        parcel2 = LandParcel(
            id=str(uuid.uuid4()),
            village_id="village-1",
            khasra_number="123/2",
            area_geom=5.0,
            owner_id=None  # No owner
        )
        parcel3 = LandParcel(
            id=str(uuid.uuid4()),
            village_id="village-1",
            khasra_number="123/3",
            area_geom=5.0,
            owner_id=""  # Empty string
        )
        
        db_session.add_all([parcel1, parcel2, parcel3])
        db_session.commit()
        
        response = client.get("/parcels/stats/farmers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_farmers"] == 1  # Only farmer-1
        assert data["total_parcels"] == 3  # All 3 parcels counted
    
    def test_farmer_stats_with_duplicate_owners(self, client: TestClient, auth_headers, db_session: Session):
        """Test that duplicate owners are counted only once"""
        # Create 10 parcels but only 3 unique owners
        owners = ["farmer-1", "farmer-2", "farmer-3"]
        
        for i in range(10):
            parcel = LandParcel(
                id=str(uuid.uuid4()),
                village_id="village-1",
                khasra_number=f"123/{i+1}",
                area_geom=5.0,
                owner_id=owners[i % 3]  # Cycle through 3 owners
            )
            db_session.add(parcel)
        db_session.commit()
        
        response = client.get("/parcels/stats/farmers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_farmers"] == 3  # Only 3 unique owners
        assert data["total_parcels"] == 10
        assert round(data["avg_parcels_per_farmer"], 2) == 3.33
