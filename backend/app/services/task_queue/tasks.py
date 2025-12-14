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

        if doc_type.lower() in ["mutation", "registry", "transfer", "sale"]:
            logger.info(f"Routing {doc_type} document to Transfer Sync workflow")
            routing_result = frappe_sync.sync_transfer_to_frappe(
                doc_id=ocr_result["doc_id"],
                fields=fields,
                file_content=image_data,
                file_name=object_name
            )
        else:
            # Handle Multi-Row (e.g. Split Jamabandi)
            # If extractor provided 'data_rows', standard flow might need to process each.
            # Current implementation of analyze_and_route_review expects one doc.
            # We will route the MAIN fields, then optionally background sync the others if needed.
            
            # For now, just route the main one to avoid spamming Review/Frappe with sub-tasks
            # OR loop and aggregate results? 
            # Let's loop but only Create Review for the first/aggregate?
            # Decision: Process ALL rows to ensure all Khasras are synced if auto-sync is on.
            
            rows_to_process = ocr_service.extract_fields(ocr_result, doc_type).get("data_rows", [fields])
            
            # We'll return the result of the LAST processed row as the "task result", 
            # or merge them. For simplicity, we process the first one as "Master" for review,
            # and others as "Auto-Sync" candidates.
            
            # Actually, to be safe and simple: just process the extracted 'fields' (which defaults to row 1).
            # If the user wants FULL expansion, we need a Loop.
            # Let's enable Loop for 'girdawari' type where Khasra expansion is critical.
            
            if doc_type == "girdawari" and len(rows_to_process) > 1:
                results = []
                for idx, row in enumerate(rows_to_process):
                    sub_doc_id = f"{ocr_result['doc_id']}_{idx}"
                    res = frappe_sync.analyze_and_route_review(
                        doc_id=sub_doc_id, 
                        doc_type=doc_type,
                        fields=row,
                        field_confidences=field_confidences,
                        overall_confidence=ocr_result["confidence"],
                        is_handwritten=False,
                        has_tables=has_tables,
                        table_confidence=table_confidence,
                        file_content=image_data if idx == 0 else None, # Only attach file to first?
                        file_name=object_name
                    )
                    results.append(res)
                routing_result = results[0] # Return first for task status
                routing_result["sub_tasks_count"] = len(results)
            else:
                 routing_result = frappe_sync.analyze_and_route_review(
                    doc_id=ocr_result["doc_id"], 
                    doc_type=doc_type,
                    fields=fields,
                    field_confidences=field_confidences,
                    overall_confidence=ocr_result["confidence"],
                    is_handwritten=False, 
                    has_tables=has_tables,
                    table_confidence=table_confidence,
                    file_content=image_data,
                    file_name=object_name
                )

        
        logger.info(f"DEBUG: routing_result type: {type(routing_result)}")
        logger.info(f"DEBUG: ocr_result keys: {ocr_result.keys()}")

        # Ensure we have a dict for 'ocr' even if it's None in the result
        ocr_data = ocr_result.get("ocr") or {}
        raw_text_snippet = ocr_data.get("text", "")[:100] + "..." if ocr_data.get("text") else ""

        final_result = {
            "doc_id": job_id,
            "fields": fields,
            "confidence": ocr_result.get("confidence", 0.0),
            "field_confidences": field_confidences,
            "review_routing": routing_result,
            "raw_text": raw_text_snippet
        }
        
        # Update Status: Completed
        redis_client.set(f"job:{job_id}", json.dumps({"status": "completed", "progress": 100, "result": final_result}))
        
        # Safe access for logging
        needs_review = routing_result.get("analysis", {}).get("needs_review") if routing_result else "Unknown"
        logger.info(f"Task {job_id} completed successfully. Review Required: {needs_review}")
        return final_result
        
    except Exception as e:
        logger.error(f"OCR Task failed: {e}")
        redis_client.set(f"job:{job_id}", json.dumps({"status": "failed", "error": str(e)}))
        return {"status": "failed", "error": str(e)}
