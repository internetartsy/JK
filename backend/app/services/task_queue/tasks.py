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
    logger.info(f"Starting background OCR task for file: {bucket_name}/{object_name}")
    job_id = object_name.rsplit('.', 1)[0] # simple extension removal
    
    # Update Status: Processing
    redis_client.set(f"job:{job_id}", {"status": "processing"})
    
    try:
        storage = MinIOClient()
        ocr_service = OCRService()
        
        # 1. Download image from MinIO
        image_data = storage.download_file(bucket_name, object_name)
        
        if not image_data:
             error_msg = f"Failed to download file {object_name} from {bucket_name}"
             logger.error(error_msg)
             redis_client.set(f"job:{job_id}", {"status": "failed", "error": error_msg})
             return {"status": "failed", "step": "download", "error": error_msg}

        # 2. Process OCR
        result = ocr_service.process_document(image_data, doc_type=doc_type, langs=langs)
        
        # Update Status: Completed
        redis_client.set(f"job:{job_id}", {"status": "completed", "result": result})
        return result
        
    except Exception as e:
        logger.error(f"OCR Task failed: {e}")
        redis_client.set(f"job:{job_id}", {"status": "failed", "error": str(e)})
        return {"status": "failed", "error": str(e)}
