from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.db.session import SessionLocal
from app.models.person import Person
from app.models.land_parcel import LandParcel
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/frappe", tags=["frappe-sync"])
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Request models
class FrappeEventPayload(BaseModel):
    doctype: str
    name: str
    action: str  # insert, update, delete
    data: Dict[str, Any]

@router.post("/webhook")
async def frappe_webhook(
    payload: FrappeEventPayload,
    x_frappe_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint to receive events from Frappe
    """
    logger.info(f"Received Frappe event: {payload.doctype} - {payload.action}")
    
    try:
        if payload.doctype == "Farmer":
            return await sync_farmer(payload, db)
        elif payload.doctype == "Land Parcel":
            return await sync_land_parcel(payload, db)
        elif payload.doctype == "Review Task":
            return await sync_review_task(payload, db)
        else:
            logger.warning(f"Unhandled doctype: {payload.doctype}")
            return {"status": "ignored", "message": f"Doctype {payload.doctype} not synced"}
    
    except Exception as e:
        logger.error(f"Error syncing {payload.doctype}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def sync_farmer(payload: FrappeEventPayload, db: Session):
    """Sync Farmer doctype to Person table"""
    data = payload.data
    
    if payload.action == "delete":
        person = db.query(Person).filter(Person.id == data.get("farmer_id")).first()
        if person:
            db.delete(person)
            db.commit()
        return {"status": "deleted", "id": data.get("farmer_id")}
    
    person = db.query(Person).filter(Person.id == data.get("farmer_id")).first()
    
    if not person:
        person = Person(
            id=data.get("farmer_id"),
            name_urdu=data.get("name_urdu"),
            name_english=data.get("name_english"),
            confidence=data.get("confidence", 0.8),
            consent_flags=data.get("consent_flags", {})
        )
        db.add(person)
    else:
        person.name_urdu = data.get("name_urdu")
        person.name_english = data.get("name_english")
        person.confidence = data.get("confidence", 0.8)
        person.consent_flags = data.get("consent_flags", {})
    
    db.commit()
    db.refresh(person)
    
    return {"status": "synced", "action": payload.action, "id": person.id}

async def sync_land_parcel(payload: FrappeEventPayload, db: Session):
    """Sync Land Parcel doctype to LandParcel table"""
    data = payload.data
    
    if payload.action == "delete":
        parcel = db.query(LandParcel).filter(LandParcel.id == data.get("parcel_id")).first()
        if parcel:
            db.delete(parcel)
            db.commit()
        return {"status": "deleted", "id": data.get("parcel_id")}
    
    parcel = db.query(LandParcel).filter(LandParcel.id == data.get("parcel_id")).first()
    
    if not parcel:
        parcel = LandParcel(
            id=data.get("parcel_id"),
            village_id=data.get("village_id"),
            khasra_number=data.get("khasra_number"),
            area_text=data.get("area_text"),
            area_geom=data.get("area_geom"),
            status=data.get("status", "active"),
            version=data.get("version", 1)
        )
        db.add(parcel)
    else:
        parcel.village_id = data.get("village_id")
        parcel.khasra_number = data.get("khasra_number")
        parcel.area_text = data.get("area_text")
        parcel.area_geom = data.get("area_geom")
        parcel.status = data.get("status", "active")
        parcel.version = data.get("version", 1)
    
    db.commit()
    db.refresh(parcel)
    
    return {"status": "synced", "action": payload.action, "id": parcel.id}

async def sync_review_task(payload: FrappeEventPayload, db: Session):
    """Handle Review Task sync - store in audit log or process"""
    data = payload.data
    
    # Review Tasks don't need to be stored in PostGIS
    # but we log them for audit purposes
    logger.info(f"Review Task synced: {data.get('document_id')} - {data.get('status')}")
    
    return {
        "status": "logged",
        "action": payload.action,
        "document_id": data.get("document_id"),
        "task_status": data.get("status")
    }

@router.get("/health")
async def frappe_sync_health():
    """Health check for Frappe sync service"""
    return {"status": "ok", "service": "frappe-sync"}
