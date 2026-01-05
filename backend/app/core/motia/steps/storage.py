from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.storage.minio_client import MinIOClient

class StorageStep(Step):
    """Downloads binary payload from object storage"""
    
    async def _handle(self, context: StepContext) -> StepContext:
        bucket = self.config.get("bucket", "scans")
        object_name = self.config.get("object_name") or f"{context.document_1d}.jpg"
        
        storage = MinIOClient()
        data = storage.download_file(bucket, object_name)
        
        if not data:
            raise ValueError(f"Object {object_name} not found in {bucket}")
        
        context.payload["binary_data"] = data
        context.results["storage"] = {"status": "downloaded", "bucket": bucket, "object": object_name}
        return context
