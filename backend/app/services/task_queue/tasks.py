from app.core.celery_app import celery_app
from app.services.ocr.ocr_service import OCRService
from app.services.storage.minio_client import MinIOClient
import logging
import json

logger = logging.getLogger(__name__)

from app.core.redis import redis_client

@celery_app.task(name="process_ocr_document")
def process_ocr_document_task(object_name: str, bucket_name: str = "scans", doc_type: str = "girdawari", langs: str = "ur+en"):
    """
    Background Task: Process OCR for a document.
    Expects object_name (filename in MinIO) to fetch the image.
    Updates Redis with job status using job_id derived from filename.
    """
    # job_id is doc_id (filename without extension)
    job_id = object_name.rsplit('.', 1)[0]
    logger.info(f"Starting background OCR task for job: {job_id}")
    
    # Update Status: Processing
    redis_client.set(f"job:{job_id}", json.dumps({"status": "processing", "progress": 10}))
    
    try:
        storage = MinIOClient()
        ocr_service = OCRService()
        from app.services.frappe_sync.sync_service import FrappeSyncService
        frappe_sync = FrappeSyncService()
        
        # 1. Download image from MinIO
        image_data = storage.download_file(bucket_name, object_name)
        
        if not image_data:
             error_msg = f"Failed to download file {object_name} from {bucket_name}"
             logger.error(error_msg)
             redis_client.set(f"job:{job_id}", json.dumps({"status": "failed", "error": error_msg}))
             return {"status": "failed", "step": "download", "error": error_msg}

        redis_client.set(f"job:{job_id}", json.dumps({"status": "processing", "progress": 30, "message": "Running OCR"}))

        # 2. Process OCR
        ocr_result = ocr_service.process_document(image_data, doc_type=doc_type, langs=langs)
        
        if "error" in ocr_result.get("ocr", {}):
            raise Exception(f"OCR Engine Failed: {ocr_result['ocr']['error']}")

        redis_client.set(f"job:{job_id}", json.dumps({"status": "processing", "progress": 60, "message": "Extracting Fields"}))

        # 3. Extract Fields
        fields = ocr_service.extract_fields(ocr_result, doc_type)
        
        # 4. Review Routing (Logic Mirroring Synchronous Endpoint)
        field_confidences = ocr_result.get("field_confidences", {})
        if not field_confidences:
             base_conf = ocr_result.get("confidence", 0.7)
             field_confidences = {k: base_conf for k in fields.keys()}
        
        has_tables = bool(ocr_result.get("tables"))
        table_confidence = ocr_result.get("table_confidence")
        
        redis_client.set(f"job:{job_id}", json.dumps({"status": "processing", "progress": 80, "message": "Analyzing Confidence"}))

        routing_result = frappe_sync.analyze_and_route_review(
            doc_id=ocr_result["doc_id"], # Should match job_id ideally
            doc_type=doc_type,
            fields=fields,
            field_confidences=field_confidences,
            overall_confidence=ocr_result["confidence"],
            is_handwritten=False, # TODO: Detect handwriting or pass as arg
            has_tables=has_tables,
            table_confidence=table_confidence,
            file_content=image_data,
            file_name=object_name
        )

        final_result = {
            "doc_id": job_id,
            "fields": fields,
            "confidence": ocr_result["confidence"],
            "field_confidences": field_confidences,
            "review_routing": routing_result,
            "raw_text": ocr_result.get("ocr", {}).get("text", "")[:100] + "..." # Truncate for Redis
        }
        
        # Update Status: Completed
        redis_client.set(f"job:{job_id}", json.dumps({"status": "completed", "progress": 100, "result": final_result}))
        
        logger.info(f"Task {job_id} completed successfully. Review Required: {routing_result.get('needs_review')}")
        return final_result
        
    except Exception as e:
        logger.error(f"OCR Task failed: {e}")
        redis_client.set(f"job:{job_id}", json.dumps({"status": "failed", "error": str(e)}))
        return {"status": "failed", "error": str(e)}
