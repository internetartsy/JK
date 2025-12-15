from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz, process
import phonenumbers
import logging

logger = logging.getLogger(__name__)

class SchemaMatchingService:
    """
    Service to calculate similarity scores between ROR (Record of Rights) and external schemes
    (PMKISAN, PMFBY, SASDB) to create a consolidated Farmer Registry.
    """

    @staticmethod
    def calculate_similarity(
        ror_name: str, 
        scheme_name: str, 
        ror_father: Optional[str] = None, 
        scheme_father: Optional[str] = None,
        ror_mobile: Optional[str] = None,
        scheme_mobile: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate similarity score between two records.
        """
        if not ror_name or not scheme_name:
            return {"total_score": 0, "details": {}}

        # 1. Name Similarity (Weighted 60%)
        # Token Sort Ratio handles "First Last" vs "Last First"
        name_score = fuzz.token_sort_ratio(ror_name.lower(), scheme_name.lower())
        
        # 2. Father Name Similarity (Weighted 30%)
        father_score = 0
        if ror_father and scheme_father:
            father_score = fuzz.token_sort_ratio(ror_father.lower(), scheme_father.lower())
        
        # 3. Mobile Number Match (Weighted 10% - Exact Match favored)
        mobile_score = 0
        if ror_mobile and scheme_mobile:
            # Normalize phones
            try:
                # Basic cleanup if phonenumbers fails
                p1 = "".join(filter(str.isdigit, str(ror_mobile)))[-10:]
                p2 = "".join(filter(str.isdigit, str(scheme_mobile)))[-10:]
                if p1 == p2:
                    mobile_score = 100
            except Exception:
                pass
        
        # Calculate Weighted Score
        # Adjust weights based on availability of fields
        if ror_father and scheme_father:
            total_score = (name_score * 0.6) + (father_score * 0.3) + (mobile_score * 0.1)
        else:
            # Fallback if no father name: higher weight to name and mobile
            total_score = (name_score * 0.8) + (mobile_score * 0.2)
            
        return {
            "total_score": round(total_score, 2),
            "name_score": name_score,
            "father_score": father_score,
            "mobile_score": mobile_score
        }

    def match_pmkisan(self, ror_records: List[Dict], pmkisan_records: List[Dict]) -> List[Dict]:
        """
        Match ROR against PMKISAN records.
        Returns matched list with similarity scores.
        """
        matches = []
        # Indexing optimizations (e.g. blocking) could be added here for large datasets.
        # For now, simplistic O(N*M) or filtering by village.
        
        for ror in ror_records:
            best_match = None
            highest_score = 0
            
            for pmk in pmkisan_records:
                # Optional: Filter by Village/District first for performance
                if ror.get("village") and pmk.get("village"):
                    if fuzz.ratio(ror["village"].lower(), pmk["village"].lower()) < 70:
                        continue

                sim = self.calculate_similarity(
                    ror_name=ror.get("name"),
                    scheme_name=pmk.get("farmerName"),
                    ror_father=ror.get("father_name"),
                    scheme_father=pmk.get("fatherName"),
                    ror_mobile=ror.get("mobile"),
                    scheme_mobile=pmk.get("mobileNo")
                )
                
                if sim["total_score"] > highest_score:
                    highest_score = sim["total_score"]
                    best_match = {
                        "ror_id": ror.get("id"),
                        "pmkisan_id": pmk.get("registrationNo"),
                        "similarity_scores": sim,
                        "match_status": self._classify_match(sim["total_score"]),
                        "matched_record": pmk
                    }
            
            if best_match and highest_score > 30: # Threshold
                matches.append(best_match)
                
        return matches

    def match_pmfby(self, ror_records: List[Dict], pmfby_records: List[Dict]) -> List[Dict]:
        """Match ROR against PMFBY records."""
        matches = []
        for ror in ror_records:
            best_match = None
            highest_score = 0
            
            for pmfby in pmfby_records:
                sim = self.calculate_similarity(
                    ror_name=ror.get("name"),
                    scheme_name=pmfby.get("farmerName"),
                    ror_father=ror.get("father_name"),
                    scheme_father=pmfby.get("relationName"), # PMFBY often uses relationName
                    ror_mobile=ror.get("mobile"),
                    scheme_mobile=pmfby.get("mobileNo")
                )
                
                if sim["total_score"] > highest_score:
                    highest_score = sim["total_score"]
                    best_match = {
                        "ror_id": ror.get("id"),
                        "pmfby_id": pmfby.get("applicationNo"),
                        "similarity_scores": sim,
                        "match_status": self._classify_match(sim["total_score"]),
                        "matched_record": pmfby
                    }
                    
            if best_match and highest_score > 30:
                matches.append(best_match)
        return matches

    def match_sasdb(self, ror_records: List[Dict], sasdb_records: List[Dict]) -> List[Dict]:
        """Match ROR against SASDB records."""
        matches = []
        for ror in ror_records:
            best_match = None
            highest_score = 0
            
            for sas in sasdb_records:
                sim = self.calculate_similarity(
                    ror_name=ror.get("name"),
                    scheme_name=sas.get("name"),
                    ror_father=ror.get("father_name"),
                    scheme_father=sas.get("father_name"), 
                    ror_mobile=ror.get("mobile"),
                    scheme_mobile=sas.get("phone")
                )
                
                if sim["total_score"] > highest_score:
                    highest_score = sim["total_score"]
                    best_match = {
                        "ror_id": ror.get("id"),
                        "sasdb_id": sas.get("id"),
                        "similarity_scores": sim,
                        "match_status": self._classify_match(sim["total_score"]),
                        "matched_record": sas
                    }
                    
            if best_match and highest_score > 30:
                matches.append(best_match)
        return matches

    def _classify_match(self, score: float) -> str:
        if score >= 80:
            return "EXCELLENT"
        elif score >= 60:
            return "GOOD"
        elif score >= 40:
            return "AVERAGE"
        else:
            return "POOR"

    def consolidate_and_deduplicate(self, all_matches: List[Dict]) -> List[Dict]:
        """
        Create a unique list of farmers at state level.
        Deduplicates based on Mobile, ROR ID, or high confidence matches.
        """
        unique_farmers = {}
        
        for match in all_matches:
            # Keying by ROR ID typically ensures we anchor to Land Records (Golden Source)
            ror_id = match.get("ror_id")
            
            if ror_id not in unique_farmers:
                unique_farmers[ror_id] = {
                    "ror_id": ror_id,
                    "matches": [],
                    "best_score": 0,
                    "status": "Draft"
                }
            
            unique_farmers[ror_id]["matches"].append(match)
            if match["similarity_scores"]["total_score"] > unique_farmers[ror_id]["best_score"]:
                unique_farmers[ror_id]["best_score"] = match["similarity_scores"]["total_score"]
        
        # Flatten for dashboard
        result_list = []
        for ror_id, data in unique_farmers.items():
            result_list.append(data)
            
        return result_list

matching_service = SchemaMatchingService()
