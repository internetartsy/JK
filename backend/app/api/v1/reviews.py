from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.review_task import ReviewTask, ReviewStatus
from pydantic import BaseModel

router = APIRouter()

class ReviewTaskSchema(BaseModel):
    id: str
    document_id: str
    document_type: str
    confidence_score: float
    extracted_fields: dict
    status: str
    assigned_to: str | None = None

    class Config:
        from_attributes = True

@router.get("/pending", response_model=List[ReviewTaskSchema])
def get_pending_reviews(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(ReviewTask).filter(ReviewTask.status == ReviewStatus.PENDING).offset(skip).limit(limit).all()

@router.post("/{id}/approve")
def approve_review(
    id: str,
    db: Session = Depends(deps.get_db),
):
    task = db.query(ReviewTask).filter(ReviewTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
    task.status = ReviewStatus.APPROVED
    db.commit()
    db.refresh(task)
    return task

@router.post("/{id}/reject")
def reject_review(
    id: str,
    db: Session = Depends(deps.get_db),
):
    task = db.query(ReviewTask).filter(ReviewTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
    task.status = ReviewStatus.REJECTED
    db.commit()
    db.refresh(task)
    return task
