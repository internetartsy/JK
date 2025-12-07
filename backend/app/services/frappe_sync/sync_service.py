from typing import Dict, Any, Optional
from app.services.frappe_sync.frappe_client import FrappeClient
from app.models.person import Person
from app.models.land_parcel import LandParcel
from app.services.ocr.confidence_config import (
    confidence_analyzer, 
    ReviewPriority,
    HANDWRITTEN_ADJUSTMENTS
)
import logging

logger = logging.getLogger(__name__)

class FrappeSyncService:
    """Service to sync PostGIS data back to Frappe"""
    
    def __init__(self):
        self.client = FrappeClient()
    
    def sync_person_to_frappe(self, person: Person, action: str = "create") -> Dict[str, Any]:
        """
        Sync Person from PostGIS to Frappe Farmer doctype
        
        Args:
            person: Person model instance
            action: 'create' or 'update'
        """
        data = {
            "farmer_id": str(person.id),
            "name_urdu": person.name_urdu,
            "name_english": person.name_english,
            "confidence": person.confidence,
            "consent_flags": person.consent_flags
        }
        
        if action == "create":
            result = self.client.create_doc("Farmer", data)
        else:
            result = self.client.update_doc("Farmer", str(person.id), data)
        
        logger.info(f"Synced Person {person.id} to Frappe: {action}")
        return result
    
    def sync_parcel_to_frappe(self, parcel: LandParcel, action: str = "create") -> Dict[str, Any]:
        """
        Sync LandParcel from PostGIS to Frappe Land Parcel doctype
        
        Args:
            parcel: LandParcel model instance
            action: 'create' or 'update'
        """
        data = {
            "parcel_id": str(parcel.id),
            "village_id": parcel.village_id,
            "khasra_number": parcel.khasra_number,
            "area_text": parcel.area_text,
            "area_geom": parcel.area_geom,
            "status": parcel.status,
            "version": parcel.version
        }
        
        if action == "create":
            result = self.client.create_doc("Land Parcel", data)
        else:
            result = self.client.update_doc("Land Parcel", str(parcel.id), data)
        
        logger.info(f"Synced Parcel {parcel.id} to Frappe: {action}")
        return result
    
    def analyze_and_route_review(
        self,
        doc_id: str,
        doc_type: str,
        fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        overall_confidence: float,
        is_handwritten: bool = False,
        has_tables: bool = False,
        table_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyze extraction confidence and route to appropriate review workflow
        
        This is the main entry point for intelligent review routing.
        Uses tiered thresholds based on field importance and document type.
        """
        # Analyze using the confidence analyzer
        analysis = confidence_analyzer.analyze_extraction(
            doc_type=doc_type,
            fields=fields,
            field_confidences=field_confidences,
            overall_confidence=overall_confidence,
            is_handwritten=is_handwritten,
            has_tables=has_tables,
            table_confidence=table_confidence
        )
        
        result = {
            "analysis": analysis,
            "review_created": False,
            "review_task_id": None
        }
        
        if analysis["needs_review"]:
            # Create review task with priority
            review_result = self.create_review_task_with_priority(
                doc_id=doc_id,
                doc_type=doc_type,
                fields=fields,
                field_confidences=field_confidences,
                overall_confidence=overall_confidence,
                priority=analysis["priority"],
                fields_to_review=analysis["fields_to_review"],
                review_notes=analysis["review_notes"],
                suggested_assignee=analysis["suggested_assignee"],
                is_handwritten=is_handwritten
            )
            
            result["review_created"] = True
            result["review_task_id"] = review_result.get("name")
            
            logger.info(
                f"Created review task for {doc_type} {doc_id} "
                f"with priority {analysis['priority'].value}"
            )
        else:
            logger.info(
                f"No review needed for {doc_type} {doc_id} "
                f"(confidence: {overall_confidence:.2f})"
            )
        
        return result
    
    def create_review_task_with_priority(
        self,
        doc_id: str,
        doc_type: str,
        fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        overall_confidence: float,
        priority: ReviewPriority,
        fields_to_review: list,
        review_notes: str,
        suggested_assignee: Optional[str] = None,
        is_handwritten: bool = False
    ) -> Dict[str, Any]:
        """
        Create a ReviewTask in Frappe with priority and detailed metadata
        """
        # Determine if dual review is needed
        require_dual_review = (
            is_handwritten and 
            priority == ReviewPriority.CRITICAL and
            HANDWRITTEN_ADJUSTMENTS.get("require_dual_review", False)
        )
        
        task_data = {
            "document_id": doc_id,
            "document_type": doc_type,
            "confidence_score": overall_confidence,
            "extracted_fields": fields,
            "field_confidences": field_confidences,
            "status": "Pending",
            "priority": priority.value,
            "fields_to_review": fields_to_review,
            "review_notes": review_notes,
            "is_handwritten": is_handwritten,
            "require_dual_review": require_dual_review,
            "assigned_to": suggested_assignee
        }
        
        try:
            result = self.client.create_doc("Review Task", task_data)
            return result
        except Exception as e:
            logger.error(f"Failed to create review task: {e}")
            return {"error": str(e)}
    
    def create_review_task_for_low_confidence(
        self,
        doc_id: str,
        doc_type: str,
        confidence: float,
        fields: Dict[str, Any],
        threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Legacy method - creates review task with simple threshold check
        
        DEPRECATED: Use analyze_and_route_review() for better routing
        """
        if confidence < threshold:
            logger.info(f"Creating ReviewTask for {doc_type} {doc_id} (confidence: {confidence})")
            return self.client.create_review_task(doc_id, doc_type, confidence, fields)
        
        return {"status": "skipped", "reason": "confidence above threshold"}

