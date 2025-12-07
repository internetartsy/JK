from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from app.api.deps import check_api_version, RoleChecker
from app.services.storage.minio_client import MinIOClient
import uuid
import hashlib

router = APIRouter(prefix="/files", tags=["files"])
storage = MinIOClient()

# In-memory chunk tracking (replace with Redis in production)
upload_sessions = {}

@router.post("/init-upload", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def init_upload(filename: str = Form(...), total_chunks: int = Form(...), checksum: str = Form(...)):
    """Initialize a chunked upload session"""
    upload_id = str(uuid.uuid4())
    upload_sessions[upload_id] = {
        "filename": filename,
        "total_chunks": total_chunks,
        "received_chunks": 0,
        "checksum": checksum,
        "parts": {}
    }
    return {"upload_id": upload_id}

@router.post("/upload-chunk", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
async def upload_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    file: UploadFile = File(...)
):
    """Upload a single chunk"""
    if upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    content = await file.read()
    upload_sessions[upload_id]["parts"][chunk_index] = content
    upload_sessions[upload_id]["received_chunks"] += 1
    
    return {"status": "chunk_received", "chunk_index": chunk_index}

@router.post("/commit-upload", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def commit_upload(upload_id: str = Form(...)):
    """Commit the upload, reassemble file, verify checksum, and upload to storage"""
    if upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    session = upload_sessions[upload_id]
    if session["received_chunks"] != session["total_chunks"]:
        raise HTTPException(status_code=400, detail="Not all chunks received")
    
    # Reassemble
    full_content = bytearray()
    for i in range(session["total_chunks"]):
        if i not in session["parts"]:
            raise HTTPException(status_code=400, detail=f"Missing chunk {i}")
        full_content.extend(session["parts"][i])
    
    # Verify checksum
    sha256_hash = hashlib.sha256(full_content).hexdigest()
    if sha256_hash != session["checksum"]:
        del upload_sessions[upload_id]
        raise HTTPException(status_code=400, detail="Checksum mismatch")
    
    # Upload to MinIO
    object_name = f"{upload_id}-{session['filename']}"
    storage.upload_file("scans", object_name, bytes(full_content))
    
    # Cleanup
    del upload_sessions[upload_id]
    
    return {"status": "completed", "file_url": object_name}

@router.post("/upload", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
async def upload_file_simple(file: UploadFile = File(...)):
    """Simple single-file upload for mobile app"""
    try:
        content = await file.read()
        filename = f"{uuid.uuid4()}-{file.filename}"
        storage.upload_file("scans", filename, content)
        return {"filename": filename, "url": f"/files/{filename}"} # Return relative URL or ID
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
