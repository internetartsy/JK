import os
from minio import Minio
from minio.error import S3Error
from io import BytesIO

class MinIOClient:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=False
        )
        
        self._ensure_buckets()
    
    def _ensure_buckets(self):
        """Ensure required buckets exist"""
        buckets = ["scans", "ocr-output", "processed"]
        for bucket in buckets:
            try:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
            except S3Error as e:
                print(f"Error ensuring bucket {bucket}: {e}")
    
    def upload_file(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        """Upload file to MinIO"""
        try:
            self.client.put_object(
                bucket,
                object_name,
                BytesIO(data),
                length=len(data),
                content_type=content_type
            )
            return True
        except S3Error as e:
            print(f"Error uploading file: {e}")
            return False
    
    def download_file(self, bucket: str, object_name: str) -> bytes:
        """Download file from MinIO"""
        try:
            response = self.client.get_object(bucket, object_name)
            return response.read()
        except S3Error as e:
            print(f"Error downloading file: {e}")
            return None
    
    def get_presigned_url(self, bucket: str, object_name: str, expires=3600):
        """Get presigned URL for object"""
        try:
            return self.client.presigned_get_object(bucket, object_name, expires=expires)
        except S3Error as e:
            print(f"Error generating presigned URL: {e}")
            return None
