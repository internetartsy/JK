from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Any
from app.services.frappe_sync.frappe_client import FrappeClient
from pydantic import BaseModel

router = APIRouter()
frappe = FrappeClient()

class ReviewTaskSchema(BaseModel):
    id: str  # maps to 'name' in Frappe
    document_id: str
    document_type: str
    confidence_score: float
    extracted_fields: dict
    status: str
    assigned_to: str | None = None

    class Config:
        from_attributes = True

@router.get("/pending", response_model=List[ReviewTaskSchema])
def get_pending_reviews():
    """Fetch Pending Review Tasks directly from Frappe"""
    try:
        # Fetch fields needed for the UI
        fields = ["name", "document_id", "document_type", "confidence_score", "extracted_fields", "status", "assigned_to"]
        filters = {"status": "Pending"}
        
        response = frappe.get_list("Review Task", fields=fields, filters=filters)
        
        tasks = []
        # FrappeClient.get_list returns the list directly
        if not response:
             return []

        for item in response:
            import json
            # Handle potential stringified JSON from Frappe
            extracted = item.get("extracted_fields", {})
            if isinstance(extracted, str):
                try:
                    extracted = json.loads(extracted)
                except:
                    extracted = {}

            tasks.append(ReviewTaskSchema(
                id=item.get("name"),
                document_id=item.get("document_id"),
                document_type=item.get("document_type"),
                confidence_score=item.get("confidence_score"),
                extracted_fields=extracted,
                status=item.get("status"),
                assigned_to=item.get("assigned_to")
            ))
            
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews from Frappe: {str(e)}")

class ReviewAction(BaseModel):
    corrected_data: dict | None = None

@router.post("/{id}/approve")
def approve_review(id: str, action: ReviewAction = Body(...)):
    """Approve Review Task in Frappe"""
    try:
        # 1. Update Corrected Data if provided
        if action.corrected_data:
            import json
            frappe.update_doc("Review Task", id, {
                "extracted_fields": json.dumps(action.corrected_data)
            })
            
        # 2. Submit Approval (Update Status)
        # Assuming Frappe workflow or simple status update
        frappe.update_doc("Review Task", id, {"status": "Approved"})
        
        # 3. (Optional) Trigger Local DB Sync or Frappe logic
        # For now, we assume Frappe hooks handle the rest (creating Land Parcel, etc.)
        
        return {"status": "approved", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve review in Frappe: {str(e)}")

@router.post("/{id}/reject")
def reject_review(id: str):
    """Reject Review Task in Frappe"""
    try:
        frappe.update_doc("Review Task", id, {"status": "Rejected"})
        return {"status": "rejected", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject review in Frappe: {str(e)}")
