from app.core.celery_app import celery_app
from app.core.motia.context import StepContext
from app.core.motia.orchestrator import MotiaOrchestrator
from app.core.motia.steps.storage import StorageStep
from app.core.motia.steps.ocr import OCRStep
from app.core.motia.steps.extraction import ExtractionStep
from app.core.motia.steps.registry_sync import RegistrySyncStep

import logging
import json
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

@celery_app.task(name="process_ocr_document")
def process_ocr_document_task(object_name: str, bucket_name: str = "scans", doc_type: str = "girdawari", langs: str = "ur+en"):
    """
    Background Task: Orchestrated via Motia Principles.
    Uses 'Step' primitives for each functional concern.
    """
    # 1. Initialize 'Thinkable' Context with Document 1D
    document_1d = object_name.rsplit('.', 1)[0]
    context = StepContext.create(document_1d=document_1d, doc_type=doc_type)
    
    logger.info(f"Starting Motia Orchestration for Document 1D: {document_1d}")
    redis_client.set(f"job:{document_1d}", json.dumps({"status": "processing", "progress": 10, "step": "initialization"}))
    
    try:
        # 2. Define Sequential Steps
        workflow = MotiaOrchestrator([
            StorageStep("Download", config={"bucket": bucket_name, "object_name": object_name}),
            OCRStep("OCR_Processing", config={"langs": langs}),
            ExtractionStep("Field_Extraction"),
            RegistrySyncStep("Registry_Reconciliation")
        ])
        
        # 3. Functional Execution
        import asyncio
        context = asyncio.run(workflow.run(context))

        # 4. Finalize
        final_result = {
            "document_1d": context.document_1d,
            "fields": context.payload.get("extracted_fields"),
            "confidence": context.results.get("ocr", {}).get("confidence", 0.0),
            "registry": context.results.get("registry_sync"),
            "metadata": context.metadata
        }
        
        redis_client.set(f"job:{document_1d}", json.dumps({
            "status": "completed", 
            "progress": 100, 
            "result": final_result
        }))
        
        return final_result
        
    except Exception as e:
        logger.error(f"Motia Orchestration failed for {document_1d}: {e}")
        redis_client.set(f"job:{document_1d}", json.dumps({"status": "failed", "error": str(e)}))
        return {"status": "failed", "error": str(e)}

