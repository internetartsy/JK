from fastapi import FastAPI, Request
from fastapi.responses import Response
from app.api import ocr
from app.api.v1 import persons, parcels, frappe_sync
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.core.metrics import (
    http_requests_total, 
    http_request_duration_seconds,
    active_requests,
    app_info
)
import time

app = FastAPI(
    title="Land Records OCR API"
)

# Set app info
app_info.info({
    "version": "1.0.0",
    "environment": "development",
    "service": "land-records-backend"
})

from fastapi.middleware.cors import CORSMiddleware

# Configure CORS
origins = [
    "http://localhost:3000",  # React PWA
    "http://localhost:8081",  # React Native Metro Bundler
    "http://localhost:8000",  # Swagger UI
    "http://localhost:8080",  # React Native Web (Custom Port)
    "*", # Allow all for development, restrict in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    # Skip metrics endpoint itself
    if request.url.path == "/metrics":
        return await call_next(request)
    
    active_requests.inc()
    start_time = time.time()
    
    # Security Audit Logging
    from app.core.security.audit import log_security_event
    
    # Extract User ID if authenticated (mock logic for now as auth is handled by Keycloak/Gateway)
    # in real flow, we would parse the JWT token from Authorization header here or trust the gateway's X-User-Id
    user_id = request.headers.get("X-User-Id", "anonymous")
    client_ip = request.client.host if request.client else "unknown"
    
    # Log sensitive actions (POST/PUT/DELETE)
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        log_security_event(
            event_type=f"API_REQUEST_STARTED",
            user_id=user_id,
            ip_address=client_ip,
            details={
                "method": request.method,
                "path": request.url.path
            }
        )

    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Record metrics
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        # Log failures for security monitoring
        if response.status_code >= 400:
             log_security_event(
                event_type=f"API_REQUEST_FAILED",
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

app.include_router(ocr.router, prefix="/api/v1")
app.include_router(persons.router, prefix="/api/v1")
app.include_router(parcels.router, prefix="/api/v1")
app.include_router(frappe_sync.router, prefix="/api/v1")
from app.api.v1 import sync
app.include_router(sync.router, prefix="/api/v1")
from app.api.v1 import files
app.include_router(files.router, prefix="/api/v1")
from app.api.v1 import geo
app.include_router(geo.router, prefix="/api/v1")
from app.api.v1 import reviews
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["reviews"])
from app.api.v1 import webhooks
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Land Records OCR System"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

from app.api.v1 import transfers
app.include_router(transfers.router, prefix="/api/v1")

from app.api.v1 import process_debt
app.include_router(process_debt.router, prefix="/api/v1")

from app.api.v1 import disputes
app.include_router(disputes.router, prefix="/api/v1")

from app.api.v1 import spatial_analysis
app.include_router(spatial_analysis.router, prefix="/api/v1")

# Register missing routers
from app.api.v1 import aadhaar_ror
app.include_router(aadhaar_ror.router, prefix="/api/v1")

from app.api.v1 import farmer_portal
app.include_router(farmer_portal.router, prefix="/api/v1")

