"""
Spatial Analysis API Endpoints
Provides endpoints for HRSI overlay, discrepancy detection, and survey prioritization
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date
from app.api.deps import get_db, check_api_version
from app.models.land_parcel import LandParcel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/spatial", tags=["spatial-analysis"])


# ==================== Request/Response Models ====================

class DiscrepancyAnalysisRequest(BaseModel):
    ulpin: str = Field(..., description="Unique Land Parcel Identification Number")
    include_satellite: bool = Field(True, description="Include satellite imagery comparison")
    
class DiscrepancyReport(BaseModel):
    ulpin: str
    khasra_number: Optional[str]
    data_sources: Dict[str, bool]
    discrepancies: Dict[str, float]
    recommendation: Dict[str, Any]
    geometric_quality: Dict[str, Any]
    
class BatchAnalysisRequest(BaseModel):
    ulpins: List[str] = Field(..., max_items=100, description="List of ULPINs to analyze")
    priority_filter: Optional[str] = Field(None, description="Filter by priority: LOW, MEDIUM, HIGH, URGENT")
    
class SurveyTask(BaseModel):
    ulpin: str
    khasra_number: str
    village_id: str
    priority: int
    area_discrepancy_pct: float
    estimated_cost: float
    assigned_surveyor: Optional[str]
    status: str
    
class GeometrySource(BaseModel):
    source_type: str = Field(..., description="'cadastral', 'satellite', or 'survey'")
    geometry_wkt: str = Field(..., description="WKT representation of polygon")
    confidence: float = Field(..., ge=0, le=1)
    metadata: Dict[str, Any] = {}


# ==================== Helper Functions ====================

def calculate_area_discrepancy(area1: float, area2: float) -> float:
    """Calculate percentage difference between two areas"""
    if area1 == 0 or area2 == 0:
        return 100.0
    return abs((area2 - area1) / area1) * 100


def calculate_shape_similarity(db: Session, geom1_wkt: str, geom2_wkt: str) -> float:
    """
    Calculate shape similarity using Hausdorff distance
    Returns a similarity score from 0-100 (100 = identical)
    """
    try:
        query = text("""
            SELECT 
                1.0 / (1.0 + ST_HausdorffDistance(
                    ST_GeomFromText(:geom1, 4326),
                    ST_GeomFromText(:geom2, 4326)
                )) * 100 as similarity
        """)
        result = db.execute(query, {"geom1": geom1_wkt, "geom2": geom2_wkt}).scalar()
        return round(result or 0, 2)
    except Exception as e:
        logger.error(f"Shape similarity calculation failed: {e}")
        return 0.0


def estimate_survey_cost(parcel_area_sqm: float, priority: int) -> float:
    """
    Estimate cost of ETS/DGPS survey based on area and priority
    Base rate: ₹500 per hectare, priority multiplier
    """
    hectares = parcel_area_sqm / 10000
    base_cost = hectares * 500
    priority_multiplier = {1: 1.5, 2: 1.2, 3: 1.0, 4: 0.8, 5: 0.6}
    return base_cost * priority_multiplier.get(priority, 1.0)


# ==================== Endpoints ====================

@router.post("/analyze-discrepancy", response_model=DiscrepancyReport)
async def analyze_parcel_discrepancy(
    request: DiscrepancyAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze discrepancies between ROR, cadastral, and satellite data for a single parcel.
    
    Returns detailed report including:
    - Available data sources
    - Area and shape discrepancies
    - Survey recommendation and priority
    - Estimated survey cost
    """
    
    # Fetch parcel data (assuming integrated schema)
    parcel = db.query(LandParcel).filter(
        LandParcel.parcel_id == request.ulpin
    ).first()
    
    if not parcel:
        raise HTTPException(
            status_code=404, 
            detail=f"Parcel {request.ulpin} not found"
        )
    
    # Check available data sources
    data_sources = {
        "ror": bool(parcel.area_text),  # Proxy for ROR data
        "cadastral": bool(parcel.geometry),
        "satellite": False  # Would check satellite_geometry field
    }
    
    # Calculate discrepancies
    area_discrepancy = 0.0
    shape_similarity = 100.0
    
    if parcel.geometry and parcel.area_geom:
        # Compare cadastral area with ROR area
        ror_area = parcel.area_geom  # Assuming already in sqm
        cadastral_area = db.execute(
            func.ST_Area(parcel.geometry)
        ).scalar()
        
        if cadastral_area:
            area_discrepancy = calculate_area_discrepancy(ror_area, cadastral_area)
    
    # Determine survey need
    needs_survey = area_discrepancy > 10 or shape_similarity < 70
    priority = 1 if area_discrepancy > 25 else 3 if area_discrepancy > 15 else 5
    
    # Build recommendation
    recommendation = {
        "needs_survey": needs_survey,
        "priority": priority,
        "priority_label": ["", "URGENT", "HIGH", "MEDIUM", "", "LOW"][priority],
        "estimated_cost": estimate_survey_cost(parcel.area_geom or 5000, priority),
        "reason": []
    }
    
    if area_discrepancy > 15:
        recommendation["reason"].append(f"High area discrepancy: {area_discrepancy:.1f}%")
    if shape_similarity < 70:
        recommendation["reason"].append(f"Low shape similarity: {shape_similarity:.1f}%")
    if not data_sources["cadastral"]:
        recommendation["reason"].append("Missing cadastral geometry")
        
    return DiscrepancyReport(
        ulpin=request.ulpin,
        khasra_number=parcel.khasra_number,
        data_sources=data_sources,
        discrepancies={
            "area_diff_pct": round(area_discrepancy, 2),
            "shape_similarity": round(shape_similarity, 2)
        },
        recommendation=recommendation,
        geometric_quality={
            "is_valid": db.execute(func.ST_IsValid(parcel.geometry)).scalar() if parcel.geometry else False,
            "area_sqm": parcel.area_geom,
            "centroid": db.execute(func.ST_AsText(func.ST_Centroid(parcel.geometry))).scalar() if parcel.geometry else None
        }
    )


@router.post("/batch-analyze", response_model=List[DiscrepancyReport])
async def batch_analyze_discrepancies(
    request: BatchAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze multiple parcels in a batch.
    Useful for village-level or tehsil-level scanning.
    """
    results = []
    
    for ulpin in request.ulpins:
        try:
            analysis = await analyze_parcel_discrepancy(
                DiscrepancyAnalysisRequest(ulpin=ulpin),
                db
            )
            results.append(analysis)
        except HTTPException:
            logger.warning(f"Parcel {ulpin} not found, skipping")
            continue
    
    # Filter by priority if requested
    if request.priority_filter:
        results = [
            r for r in results 
            if r.recommendation["priority_label"] == request.priority_filter
        ]
    
    return results


@router.get("/survey-queue", response_model=List[SurveyTask])
async def get_survey_queue(
    priority: Optional[int] = Query(None, ge=1, le=5, description="Filter by priority (1=URGENT, 5=LOW)"),
    village_id: Optional[str] = Query(None, description="Filter by village"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieve prioritized queue of parcels requiring ground survey.
    
    Returns tasks ordered by:
    1. Priority (1=highest)
    2. Economic value
    3. Dispute history
    """
    
    # This would query a dedicated survey_tasks table
    # For now, simulate by querying parcels with high area discrepancy
    
    query = db.query(LandParcel).filter(
        LandParcel.area_geom.isnot(None)
    )
    
    if village_id:
        query = query.filter(LandParcel.village_id == village_id)
    
    parcels = query.limit(limit).all()
    
    tasks = []
    for parcel in parcels:
        # Calculate on-the-fly (in production, this would be pre-computed)
        area_disc = 0.0  # Placeholder
        calc_priority = 3
        
        tasks.append(SurveyTask(
            ulpin=parcel.parcel_id or parcel.id,
            khasra_number=parcel.khasra_number,
            village_id=parcel.village_id,
            priority=calc_priority,
            area_discrepancy_pct=area_disc,
            estimated_cost=estimate_survey_cost(parcel.area_geom or 5000, calc_priority),
            assigned_surveyor=None,
            status="PENDING"
        ))
    
    # Sort by priority
    tasks.sort(key=lambda x: x.priority)
    
    return tasks


@router.post("/register-geometry")
async def register_geometry_source(
    ulpin: str,
    source: GeometrySource,
    db: Session = Depends(get_db)
):
    """
    Register a new geometry source (cadastral vectorization, satellite detection, or survey result).
    Updates the integrated parcel record with the new data.
    """
    
    parcel = db.query(LandParcel).filter(
        LandParcel.parcel_id == ulpin
    ).first()
    
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel {ulpin} not found")
    
    # Validate WKT
    try:
        is_valid = db.execute(
            text("SELECT ST_IsValid(ST_GeomFromText(:wkt, 4326))"),
            {"wkt": source.geometry_wkt}
        ).scalar()
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid WKT geometry")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Geometry validation failed: {str(e)}")
    
    # Update parcel based on source type
    if source.source_type == "cadastral":
        parcel.geometry = func.ST_GeomFromText(source.geometry_wkt, 4326)
        # Store metadata
    elif source.source_type == "satellite":
        # Would update satellite_geometry field
        pass
    elif source.source_type == "survey":
        # Ground truth - highest priority, update final_geometry
        parcel.geometry = func.ST_GeomFromText(source.geometry_wkt, 4326)
        parcel.status = "surveyed"
    
    db.commit()
    db.refresh(parcel)
    
    return {
        "ulpin": ulpin,
        "source_type": source.source_type,
        "status": "registered",
        "confidence": source.confidence
    }


@router.get("/village-statistics/{village_id}")
async def get_village_spatial_statistics(
    village_id: str,
    db: Session = Depends(get_db)
):
    """
    Get aggregated spatial statistics for a village.
    
    Returns:
    - Total parcels
    - % with cadastral data
    - % with satellite data
    - % requiring survey
    - Cost estimate for full verification
    """
    
    total_parcels = db.query(func.count(LandParcel.id)).filter(
        LandParcel.village_id == village_id
    ).scalar()
    
    with_geometry = db.query(func.count(LandParcel.id)).filter(
        and_(
            LandParcel.village_id == village_id,
            LandParcel.geometry.isnot(None)
        )
    ).scalar()
    
    # Simulated statistics
    stats = {
        "village_id": village_id,
        "total_parcels": total_parcels,
        "data_availability": {
            "cadastral_coverage": round((with_geometry / total_parcels * 100) if total_parcels > 0 else 0, 1),
            "satellite_coverage": 0,  # Placeholder
            "ror_coverage": round((total_parcels / total_parcels * 100) if total_parcels > 0 else 0, 1)
        },
        "quality_metrics": {
            "high_confidence": 0,
            "needs_review": 0,
            "needs_survey": 0
        },
        "cost_estimates": {
            "total_survey_cost": 0,
            "priority_survey_cost": 0
        }
    }
    
    return stats


@router.post("/fuse-geometries")
async def fuse_geometry_sources(
    ulpin: str,
    weights: Dict[str, float] = Body(..., description="Source weights: {'cadastral': 0.4, 'satellite': 0.6}"),
    db: Session = Depends(get_db)
):
    """
    Create a fused geometry by weighted averaging of multiple sources.
    Uses confidence scores and data quality to determine optimal geometry.
    """
    
    parcel = db.query(LandParcel).filter(
        LandParcel.parcel_id == ulpin
    ).first()
    
    if not parcel or not parcel.geometry:
        raise HTTPException(status_code=404, detail="Parcel or geometry not found")
    
    # Normalize weights
    total_weight = sum(weights.values())
    if total_weight == 0:
        raise HTTPException(status_code=400, detail="Weights sum to zero")
    
    normalized_weights = {k: v/total_weight for k, v in weights.items()}
    
    # In a real implementation, this would use ST_Union with weights
    # For now, return the highest-weighted source
    dominant_source = max(normalized_weights.items(), key=lambda x: x[1])[0]
    
    return {
        "ulpin": ulpin,
        "fused_geometry": "POLYGON(...)",  # Placeholder
        "weights_applied": normalized_weights,
        "dominant_source": dominant_source,
        "confidence": max(normalized_weights.values())
    }
