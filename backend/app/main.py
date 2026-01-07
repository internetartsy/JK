import time
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

# Core App Modules
from app.api import ocr
from app.api.v1 import (
    persons, parcels, frappe_sync, sync, files, geo, 
    reviews, webhooks, transfers, process_debt, 
    disputes, spatial_analysis, aadhaar_ror, 
    farmer_portal, farmer_registry
)
from app.core.metrics import (
    http_requests_total, 
    http_request_duration_seconds,
    active_requests,
    app_info
)
from app.core.security.audit import log_security_event

app = FastAPI(
    title="AgriStack Verified Backend",
    description="Stateless Motia/Thinkable Orchestration for Land Records",
    version="2.0.0"
)

# 1. System Metadata Initialization
app_info.info({
    "version": "2.0.0",
    "environment": "development",
    "service": "land-records-backend",
    "orchestration": "motia-unified",
    "primitive": "thinkable-step"
})

# 2. CORS Configuration
origins = [
    "http://localhost:3000",  # React PWA
    "http://localhost:8081",  # React Native Metro
    "http://localhost:8000",  # Swagger UI
    "http://localhost:8080",  # React Native Web
    "*",                      # Allow all for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Security & Telemetry Middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    if request.url.path == "/metrics":
        return await call_next(request)
    
    active_requests.inc()
    start_time = time.time()
    
    user_id = request.headers.get("X-User-Id", "anonymous")
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log for state-changing requests
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        log_security_event(
            event_type="API_REQUEST_STARTED",
            user_id=user_id,
            ip_address=client_ip,
            details={"method": request.method, "path": request.url.path}
        )

    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        if response.status_code >= 400:
             log_security_event(
                event_type="API_REQUEST_FAILED",
                user_id=user_id,
                ip_address=client_ip,
                details={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration * 1000, 2)
                }
            )
        return response
    finally:
        active_requests.dec()

# 4. Route Registration
# Core AgriStack API (v1)
app.include_router(ocr.router, prefix="/api/v1", tags=["OCR"])
app.include_router(persons.router, prefix="/api/v1", tags=["Registry"])
app.include_router(parcels.router, prefix="/api/v1", tags=["Registry"])
app.include_router(frappe_sync.router, prefix="/api/v1", tags=["Sync"])
app.include_router(sync.router, prefix="/api/v1", tags=["Sync"])
app.include_router(files.router, prefix="/api/v1", tags=["Storage"])
app.include_router(geo.router, prefix="/api/v1", tags=["GIS"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["Governance"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Integration"])
app.include_router(transfers.router, prefix="/api/v1", tags=["Workflow"])
app.include_router(process_debt.router, prefix="/api/v1", tags=["Workflow"])
app.include_router(disputes.router, prefix="/api/v1", tags=["Workflow"])
app.include_router(spatial_analysis.router, prefix="/api/v1", tags=["GIS"])
app.include_router(aadhaar_ror.router, prefix="/api/v1", tags=["KYC"])
app.include_router(farmer_portal.router, prefix="/api/v1", tags=["Portal"])
app.include_router(farmer_registry.router, prefix="/api/v1", tags=["Registry"])

# 5. Health & Monitoring
@app.get("/")
def read_root():
    return {"message": "Welcome to the AgriStack Verified Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
