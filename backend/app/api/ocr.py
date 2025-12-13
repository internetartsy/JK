from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr.ocr_service import OCRService
from typing import Dict, Any
from app.services.frappe_sync.sync_service import FrappeSyncService

router = APIRouter(prefix="/ocr", tags=["ocr"])

ocr_service = OCRService()
frappe_sync = FrappeSyncService()

@router.post("/process", response_model=Dict[str, Any])
async def process_document(
    file: UploadFile = File(...),
    doc_type: str = "girdawari",
    langs: str = "ur+en"
):
    """
    Process a land record document through OCR pipeline
    
    - **file**: Document image (JPEG, PNG, PDF)
    - **doc_type**: Type of document (girdawari, khasra, mutation, etc.)
    - **langs**: Languages for OCR (default: ur+en for Urdu and English)
    
    Returns OCR results with text, layout, tables, and confidence scores
    """
    try:
        contents = await file.read()
        result = ocr_service.process_document(contents, doc_type, langs)
        
        if "error" in result.get("ocr", {}):
            raise HTTPException(status_code=500, detail=f"OCR processing failed: {result['ocr']['error']}")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-fields", response_model=Dict[str, Any])
async def extract_fields(
    file: UploadFile = File(...),
    doc_type: str = "girdawari",
    langs: str = "ur+en",
    is_handwritten: bool = False
):
    """
    Process document and extract structured fields with intelligent review routing
    
    Args:
        file: Document image (JPEG, PNG, PDF)
        doc_type: Type of document (girdawari, khasra, mutation, etc.)
        langs: Languages for OCR (default: ur+en for Urdu and English)
        is_handwritten: Whether the document contains handwritten text
    
    Returns extracted fields with review routing decision based on:
    - Field-specific confidence thresholds
    - Document type requirements
    - Handwritten text adjustments
    """
    try:
        contents = await file.read()
        ocr_result = ocr_service.process_document(contents, doc_type, langs)
        
        if "error" in ocr_result.get("ocr", {}):
            raise HTTPException(status_code=500, detail=f"OCR processing failed: {ocr_result['ocr']['error']}")
        
        fields = ocr_service.extract_fields(ocr_result, doc_type)
        
        # Get field-level confidences if available
        field_confidences = ocr_result.get("field_confidences", {})
        if not field_confidences:
            # Generate approximate field confidences from overall
            base_conf = ocr_result.get("confidence", 0.7)
            field_confidences = {k: base_conf for k in fields.keys()}
        
        # Check for tables in result
        has_tables = bool(ocr_result.get("tables"))
        table_confidence = ocr_result.get("table_confidence")
        
        # Intelligent review routing
        try:
            routing_result = frappe_sync.analyze_and_route_review(
                doc_id=ocr_result["doc_id"],
                doc_type=doc_type,
                fields=fields,
                field_confidences=field_confidences,
                overall_confidence=ocr_result["confidence"],
                is_handwritten=is_handwritten,
                has_tables=has_tables,
                table_confidence=table_confidence
            )
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to route review task: {e}")
            routing_result = {"review_created": False, "error": str(e)}

        return {
            "doc_id": ocr_result["doc_id"],
            "fields": fields,
            "confidence": ocr_result["confidence"],
            "field_confidences": field_confidences,
            "review_routing": routing_result,
            "is_handwritten": is_handwritten
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import BackgroundTasks, Depends
from app.core.redis import redis_client
from app.api.deps import check_api_version, RoleChecker
import uuid
import json

def process_ocr_task(job_id: str, contents: bytes, doc_type: str, langs: str):
    try:
        redis_client.set(f"job:{job_id}", json.dumps({"status": "processing"}))
        result = ocr_service.process_document(contents, doc_type, langs)
        redis_client.set(f"job:{job_id}", json.dumps({"status": "completed", "result": result}))
    except Exception as e:
        redis_client.set(f"job:{job_id}", json.dumps({"status": "failed", "error": str(e)}))

@router.post("/run-async", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
async def run_ocr_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = "girdawari",
    langs: str = "ur+en"
):
    """
    Start async OCR job using Celery
    """
    # 1. Generate ID and Upload to MinIO
    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}.jpg"
    contents = await file.read()
    
    # We need to upload here so the worker can access it
    from app.services.storage.minio_client import MinIOClient
    storage = MinIOClient()
    success = storage.upload_file("scans", filename, contents, "image/jpeg")
    
    if not success:
         raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # 2. Trigger Celery Task
    from app.services.task_queue.tasks import process_ocr_document_task
    # We use doc_id as the job_id request reference, but the task returns a result we can poll via Celery if we wanted.
    # But current frontend polls redis based on job_id. 
    # To maintain compatibility, we should set the initial Redis state here.
    
    redis_client.set(f"job:{doc_id}", json.dumps({"status": "queued"}))
    
    # We need to wrap the Celery task execution to update Redis on completion?
    # Or, the Worker should update Redis. 
    # Current tasks.py just returns result. We should update tasks.py to update Redis if we want to keep this polling pattern.
    
    # For now, let's keep the pattern: The Celery task should ideally update the Redis key.
    # BUT, I didn't add that logic to tasks.py. 
    # I will modify tasks.py in the next step to update Redis status.
    
    process_ocr_document_task.delay(filename, "scans", doc_type, langs)
    
    return {"job_id": doc_id, "status": "queued"}

@router.get("/status/{job_id}", dependencies=[Depends(check_api_version)])
def get_job_status(job_id: str):
    """
    Get status of async OCR job
    """
    data = redis_client.get(f"job:{job_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return data
