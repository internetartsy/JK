"""
Pytest fixtures for Land Records backend testing.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

# Set test environment before importing app
os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app
from app.db.base_class import Base
from app.api.deps import get_db


# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override"""
    app.dependency_overrides[get_db] = override_get_db
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Cleanup
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def auth_headers():
    """Mock authentication headers for protected endpoints"""
    return {
        "Authorization": "Bearer test-token",
        "X-API-Version": "1"
    }


@pytest.fixture
def sample_parcel():
    """Sample land parcel data for testing"""
    return {
        "id": "test-parcel-001",
        "village_id": "village-123",
        "khasra_number": "123/1",
        "area_text": "5 کنال 10 مرلہ",
        "area_geom": 5.5,
        "status": "active",
        "version": 1
    }


@pytest.fixture
def sample_person():
    """Sample person data for testing"""
    return {
        "id": "test-person-001",
        "name_urdu": "محمد علی",
        "name_english": "Muhammad Ali",
        "confidence": 0.85,
        "consent_flags": {"data_collection": True, "photo": False}
    }


@pytest.fixture
def sample_ocr_image():
    """Sample image bytes for OCR testing"""
    # 1x1 white pixel JPEG
    import base64
    return base64.b64decode(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
        "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf"
        "/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=="
    )


@pytest.fixture
def mock_frappe_client(mocker):
    """Mock Frappe client for testing without actual Frappe connection"""
    mock = mocker.patch('app.services.frappe_sync.frappe_client.FrappeClient')
    mock.return_value.create_doc.return_value = {"name": "test-doc-001"}
    mock.return_value.update_doc.return_value = {"name": "test-doc-001"}
    mock.return_value.create_review_task.return_value = {"name": "review-001"}
    return mock
