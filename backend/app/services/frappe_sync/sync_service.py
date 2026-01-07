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
import json
import requests
from app.utils.parcel_id_generator import ULPINGenerator

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
    
    def _create_or_get_farmer(self, name_en: str, name_ur: str, father: str) -> Optional[str]:
        """Helper to find or create a farmer and return their ID"""
        import uuid
        # Generate a provisional ID
        farmer_id = f"FARM-{uuid.uuid4().hex[:8].upper()}"
        
        # TODO: Add search logic to avoid duplicates
        farmer_data = {
            "farmer_id": farmer_id,
            "name_english": name_en,
            "name_urdu": name_ur,
            "father_name": father
        }
        try:
             res = self.client.create_doc("Farmer", farmer_data)
             return res.get("name")
        except Exception as e:
            logger.error(f"Failed to create farmer {name_en}: {e}")
            return None

    def _create_or_get_parcel(self, 
        doc_id: str, 
        fields: Dict[str, Any], 
        current_owner_id: Optional[str] = None
    ) -> Optional[str]:
        """Helper to create or update Land Parcel with GeoJSON and ULPIN"""
        
        # Prepare GeoJSON - required for ULPIN
        geojson_raw = fields.get("geojson", fields.get("coordinates", None))
        
        # 1. Generate ULPIN
        ulpin = fields.get("ulpin")
        if not ulpin:
            # Try generating from Geometry
            if geojson_raw:
                try:
                    # Unwrap Feature if necessary
                    g_data = geojson_raw if isinstance(geojson_raw, dict) else json.loads(geojson_raw)
                    if g_data.get("type") == "Feature":
                         g_data = g_data.get("geometry")
                         
                    # Default: Jammu (01), Akhnoor (05) - in prod, map from Village ID
                    ulpin = ULPINGenerator.generate_from_centroid(
                        g_data, 
                        district_code="01", 
                        tehsil_code="05"
                    )
                    logger.info(f"Generated ULPIN {ulpin} from geometry")
                except Exception as e:
                    logger.warning(f"ULPIN Generation failed: {e}")
                    ulpin = f"JK-G-{doc_id[-6:]}".upper()
            else:
                 ulpin = f"JK-G-{doc_id[-6:]}".upper()
        
        # 2. Check if Parcel Already Exists (Idempotency)
        # 2. Check if Parcel Already Exists (Idempotency)
        try:
             # Strategy: 
             # 1. Search by ULPIN
             # 2. Search by Parcel ID (e.g. Doc ID)
             # 3. Search by Khasra + Village (Business logic duplicate)
             
             filters = [
                {"ulpin": ulpin},
                {"parcel_id": doc_id},
             ]
             
             # Also add Khasra/Village check if available
             khasra = fields.get("khasra_number")
             village = fields.get("village", fields.get("village_id"))
             
             existing_docs = []
             for f in filters:
                 res = self.client.get_list("Land Parcel", filters=f)
                 if res:
                     existing_docs = res
                     break
             
             # Fallback to Khasra/Village compound check
             if not existing_docs and khasra and village and village != "Unknown":
                 res = self.client.get_list("Land Parcel", filters={
                     "khasra_number": khasra,
                     "village_id": village
                 })
                 if res:
                     existing_docs = res
                     
             if existing_docs:
                 existing_name = existing_docs[0].get("name")
                 logger.info(f"Parcel {existing_name} already exists. Updating...")
                 # Optional: Update the ULPIN/GeoJSON on the existing record if it was missing?
                 # For now, just return it to link.
                 return existing_name
                 
        except Exception as e:
             logger.warning(f"Failed to check existing parcel: {e}")

        if geojson_raw and isinstance(geojson_raw, dict):
            import json
            geojson_raw = json.dumps(geojson_raw)

        land_data = {
            "parcel_id": doc_id, 
            "ulpin": ulpin,
            "village_id": fields.get("village", fields.get("village_id", "Unknown")),
            "khasra_number": fields.get("khasra_number", "Unknown"),
            "area_text": fields.get("area", fields.get("area_text", "")),
            "status": "Active",
            # GeoJSON mapping
            "geojson": geojson_raw
        }
        
        if current_owner_id:
            land_data["farmer_id"] = current_owner_id

        try:
            # We don't set 'name' explicitly as Frappe might use auto-naming series.
            # But since we checked for duplicates, we should be safe.
            res = self.client.create_doc("Land Parcel", land_data)
            return res.get("name")
        except Exception as e:
            logger.error(f"Failed to create parcel {doc_id}: {e}")
            return None

    def sync_transfer_to_frappe(
        self,
        doc_id: str,
        fields: Dict[str, Any],
        file_content: Optional[bytes] = None,
        file_name: Optional[str] = None,
        provided_farmer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sync extracted Mutation/Registry data to Ownership Transfer flow.
        Creates Buyer, Seller, Land Parcel (with GeoJSON), and the Transfer request.
        """
        logger.info(f"Syncing Transfer for {doc_id} (Farmer: {provided_farmer_id})")
        
        # 1. Create/Get Seller (From Farmer)
        seller_name_en = fields.get("seller_name", "Unknown")
        seller_name_ur = fields.get("seller_name_ur", seller_name_en)
        seller_father = fields.get("seller_father", "Unknown")
        from_farmer_id = self._create_or_get_farmer(seller_name_en, seller_name_ur, seller_father)
        
        # 2. Create/Get Buyer (To Farmer)
        # Use provided_farmer_id if this is a registration/KYC flow
        if provided_farmer_id:
            to_farmer_id = provided_farmer_id
            logger.info(f"Using provided farmer_id {to_farmer_id} as Buyer")
        else:
            buyer_name_en = fields.get("buyer_name", "Unknown")
            buyer_name_ur = fields.get("buyer_name_ur", buyer_name_en)
            buyer_father = fields.get("buyer_father", "Unknown")
            to_farmer_id = self._create_or_get_farmer(buyer_name_en, buyer_name_ur, buyer_father)
        
        if not from_farmer_id or not to_farmer_id:
            logger.error("Failed to create/find farmers for transfer")
            return {"error": "Failed to create farmer records"}

        # 3. Create/Get Land Parcel (Plot)
        # Note: Transfer Request links to a Plot. The Plot carries the GeoJSON.
        plot_id = self._create_or_get_parcel(doc_id, fields, current_owner_id=from_farmer_id)
        if not plot_id:
             logger.error("Failed to create land parcel for transfer")
             return {"error": "Failed to create land parcel"}

        # 4. Create Ownership Transfer
        transfer_data = {
             "transfer_id": doc_id,
             "plot_id": plot_id,
             "from_farmer": from_farmer_id,
             "to_farmer": to_farmer_id,
             "transfer_type": fields.get("transfer_type", "Sale"),
             "status": "Submitted",
             "date_of_application": fields.get("date", "Today")
        }
        
        try:
            res = self.client.create_doc("Ownership Transfer", transfer_data)
            transfer_name = res.get("name")
            logger.info(f"Created Ownership Transfer {transfer_name}")
            
            # Attach file
            if file_content and file_name and transfer_name:
                self.client.attach_file("Ownership Transfer", transfer_name, file_content, file_name)
            
            return {"transfer_created": True, "transfer_id": transfer_name}
        except Exception as e:
            logger.error(f"Failed to create Ownership Transfer: {e}")
            return {"error": str(e)}

    def analyze_and_route_review(
        self,
        doc_id: str,
        doc_type: str,
        fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        overall_confidence: float,
        is_handwritten: bool = False,
        has_tables: bool = False,
        table_confidence: Optional[float] = None,
        file_content: Optional[bytes] = None,
        file_name: Optional[str] = None,
        provided_farmer_id: Optional[str] = None
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
            
            # Attach file to Review Task if available
            if file_content and file_name and result["review_task_id"]:
                self.client.attach_file("Review Task", result["review_task_id"], file_content, file_name)
                logger.info(f"Attached source file to Review Task {result['review_task_id']}")
        else:
            logger.info(
                f"No review needed for {doc_type} {doc_id} "
                f"(confidence: {overall_confidence:.2f})"
            )
            
            # Auto-save to Frappe if high confidence
            if doc_type == "girdawari":
                try:
                    # Map OCR fields to Land Parcel schema
                    # Use doc_id as temporary ID, or generate ULPIN if backend logic permits
                    # Generate or extract ULPIN
                    ulpin = fields.get("ulpin")
                    if not ulpin:
                         # Generate provisional ULPIN
                         ulpin = f"JK-G-{doc_id[-6:]}".upper()

                    # 1. Create/Link Farmer (Owner)
                    # Extract names and handle translation (assumes OCR provides _en/_ur variants or raw)
                    owner_name_raw = fields.get("owner_name", "Unknown")
                    father_name = fields.get("father_name", "Unknown")
                    
                    # Provisional Farmer Data
                    farmer_data = {
                        "name_english": fields.get("owner_name_en", owner_name_raw), # OCR should provide English
                        "name_urdu": fields.get("owner_name_ur", owner_name_raw),   # OCR should provide Urdu
                        "father_name": father_name,
                        # Generate deterministic ID or let Frappe handle naming
                    }
                    
                    farmer_id = provided_farmer_id
                    if not farmer_id:
                        try:
                            # Try to create Farmer doc
                            # In real prod, check for duplicates first!
                            farmer_res = self.client.create_doc("Farmer", farmer_data)
                            farmer_id = farmer_res.get("name")
                            logger.info(f"Auto-created Farmer {farmer_id} for {owner_name_raw}")
                        except Exception as fe:
                            logger.warn(f"Could not create farmer: {fe}")
                    else:
                        logger.info(f"Using provided farmer_id {farmer_id} for Land Parcel linkage")

                    # 2. Create Land Parcel
                    land_data = {
                        "parcel_id": doc_id, 
                        "ulpin": ulpin,
                        "farmer_id": farmer_id, # Link the created farmer
                        "village_id": fields.get("village", fields.get("village_id", "Unknown")),
                        "khasra_number": fields.get("khasra_number", "Unknown"),
                        "area_text": fields.get("area", fields.get("area_text", "")),
                        "status": "Under Review", 
                        "owner_name": fields.get("owner_name", owner_name_raw), # English Name
                        "owner_name_in_local_language": fields.get("owner_name_urdu", owner_name_raw), # Urdu Name
                        "father_name": father_name,
                        "document_date": fields.get("date", ""),
                        "is_digitized_via_ocr": 1,
                        "source_doc_id": doc_id,
                        # GeoJSON mapping if coordinates exist in extraction
                        "geojson": fields.get("geojson", fields.get("coordinates", None)) 
                    }
                    
                    save_result = self.client.create_doc("Land Parcel", land_data)
                    result["record_created"] = True
                    result["record_id"] = save_result.get("name") # Frappe returns name/id
                    result["record_id"] = save_result.get("name") # Frappe returns name/id
                    logger.info(f"Auto-created Land Parcel {result['record_id']} in Frappe")
                    
                    # Attach file to Land Parcel if available
                    if file_content and file_name and result.get("record_id"):
                        self.client.attach_file("Land Parcel", result["record_id"], file_content, file_name)
                        logger.info(f"Attached source file to Land Parcel {result['record_id']}")
                    
                except Exception as e:
                    logger.error(f"Failed to auto-create Land Parcel in Frappe: {e}")
                    result["record_created"] = False
                    result["record_created"] = False
                    result["error"] = str(e)
        
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
        
        import json
        task_data = {
            "document_id": doc_id,
            "document_type": doc_type.capitalize(),
            "confidence_score": overall_confidence,
            "extracted_fields": json.dumps(fields), # Serialize manually to ensure string for JSON field
            "status": "Pending"
        }
        
        if suggested_assignee:
            task_data["assigned_to"] = suggested_assignee
        
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

