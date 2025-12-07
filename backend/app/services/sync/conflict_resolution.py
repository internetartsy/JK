"""
3-Way Merge Conflict Resolution Service

Provides diff generation, merge strategies, and resolution tracking for
sync conflicts between local (mobile/pwa), server, and base (common ancestor) versions.
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from datetime import datetime
import json


class ConflictField(str, Enum):
    """Field types that can have conflicts"""
    KHASRA_NUMBER = "khasra_number"
    VILLAGE_ID = "village_id"
    AREA_TEXT = "area_text"
    AREA_GEOM = "area_geom"
    STATUS = "status"
    NAME_URDU = "name_urdu"
    NAME_ENGLISH = "name_english"
    CONFIDENCE = "confidence"
    CONSENT_FLAGS = "consent_flags"


class ResolutionStrategy(str, Enum):
    """How a conflict should be resolved"""
    USE_LOCAL = "use_local"      # Keep local changes
    USE_SERVER = "use_server"    # Accept server changes
    USE_BASE = "use_base"        # Revert to base version
    MANUAL_MERGE = "manual_merge"  # User-specified merged value
    AUTO_MERGE = "auto_merge"    # Automatically merged (non-conflicting)


@dataclass
class FieldDiff:
    """Represents the difference for a single field"""
    field_name: str
    base_value: Any
    local_value: Any
    server_value: Any
    has_conflict: bool
    suggested_resolution: ResolutionStrategy
    merged_value: Optional[Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_name": self.field_name,
            "base_value": self.base_value,
            "local_value": self.local_value,
            "server_value": self.server_value,
            "has_conflict": self.has_conflict,
            "suggested_resolution": self.suggested_resolution.value,
            "merged_value": self.merged_value
        }


@dataclass
class ConflictReport:
    """Complete conflict report for an entity"""
    entity_type: str  # "parcel" or "person"
    entity_id: str
    base_version: int
    local_version: int
    server_version: int
    field_diffs: List[FieldDiff]
    has_conflicts: bool
    can_auto_merge: bool
    suggested_merged_entity: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "base_version": self.base_version,
            "local_version": self.local_version,
            "server_version": self.server_version,
            "field_diffs": [d.to_dict() for d in self.field_diffs],
            "has_conflicts": self.has_conflicts,
            "can_auto_merge": self.can_auto_merge,
            "suggested_merged_entity": self.suggested_merged_entity
        }


class ConflictResolutionService:
    """
    Service for detecting, analyzing, and resolving sync conflicts
    using 3-way merge strategy.
    """
    
    # Fields that can be auto-merged (non-semantic, additive)
    AUTO_MERGEABLE_FIELDS = {"consent_flags"}
    
    # Fields where server should typically win (e.g., canonical values)
    SERVER_PREFERRED_FIELDS = {"village_id"}
    
    # Fields where local should typically win (user edits)
    LOCAL_PREFERRED_FIELDS = {"area_text", "name_urdu", "name_english"}
    
    def compute_diff(
        self,
        entity_type: str,
        base: Dict[str, Any],
        local: Dict[str, Any],
        server: Dict[str, Any]
    ) -> ConflictReport:
        """
        Compute 3-way diff between base, local, and server versions.
        
        Args:
            entity_type: "parcel" or "person"
            base: Common ancestor version (last synced state)
            local: Current local version with pending changes
            server: Current server version
            
        Returns:
            ConflictReport with field-level diffs and merge suggestions
        """
        field_diffs = []
        has_conflicts = False
        can_auto_merge = True
        
        # Get all fields that might differ
        all_fields = set(base.keys()) | set(local.keys()) | set(server.keys())
        excluded = {"id", "updated_at", "sync_status", "created_at", "version"}
        
        for field in all_fields:
            if field in excluded:
                continue
                
            base_val = base.get(field)
            local_val = local.get(field)
            server_val = server.get(field)
            
            diff = self._compute_field_diff(
                field, base_val, local_val, server_val
            )
            field_diffs.append(diff)
            
            if diff.has_conflict:
                has_conflicts = True
                if diff.suggested_resolution == ResolutionStrategy.MANUAL_MERGE:
                    can_auto_merge = False
        
        # Build suggested merged entity
        merged = self._build_merged_entity(base, local, server, field_diffs)
        
        return ConflictReport(
            entity_type=entity_type,
            entity_id=str(local.get("id") or server.get("id")),
            base_version=base.get("version", 0),
            local_version=local.get("version", 0),
            server_version=server.get("version", 0),
            field_diffs=field_diffs,
            has_conflicts=has_conflicts,
            can_auto_merge=can_auto_merge,
            suggested_merged_entity=merged
        )
    
    def _compute_field_diff(
        self,
        field: str,
        base_val: Any,
        local_val: Any,
        server_val: Any
    ) -> FieldDiff:
        """Compute diff for a single field"""
        
        # Normalize values for comparison
        base_val = self._normalize_value(base_val)
        local_val = self._normalize_value(local_val)
        server_val = self._normalize_value(server_val)
        
        # Case 1: No changes anywhere
        if base_val == local_val == server_val:
            return FieldDiff(
                field_name=field,
                base_value=base_val,
                local_value=local_val,
                server_value=server_val,
                has_conflict=False,
                suggested_resolution=ResolutionStrategy.USE_BASE,
                merged_value=base_val
            )
        
        # Case 2: Only local changed
        if base_val == server_val and local_val != base_val:
            return FieldDiff(
                field_name=field,
                base_value=base_val,
                local_value=local_val,
                server_value=server_val,
                has_conflict=False,
                suggested_resolution=ResolutionStrategy.USE_LOCAL,
                merged_value=local_val
            )
        
        # Case 3: Only server changed
        if base_val == local_val and server_val != base_val:
            return FieldDiff(
                field_name=field,
                base_value=base_val,
                local_value=local_val,
                server_value=server_val,
                has_conflict=False,
                suggested_resolution=ResolutionStrategy.USE_SERVER,
                merged_value=server_val
            )
        
        # Case 4: Both changed to same value (clean merge)
        if local_val == server_val:
            return FieldDiff(
                field_name=field,
                base_value=base_val,
                local_value=local_val,
                server_value=server_val,
                has_conflict=False,
                suggested_resolution=ResolutionStrategy.AUTO_MERGE,
                merged_value=local_val
            )
        
        # Case 5: Both changed to different values (CONFLICT!)
        suggested, merged = self._suggest_resolution(
            field, base_val, local_val, server_val
        )
        
        return FieldDiff(
            field_name=field,
            base_value=base_val,
            local_value=local_val,
            server_value=server_val,
            has_conflict=True,
            suggested_resolution=suggested,
            merged_value=merged
        )
    
    def _suggest_resolution(
        self,
        field: str,
        base_val: Any,
        local_val: Any,
        server_val: Any
    ) -> Tuple[ResolutionStrategy, Any]:
        """
        Suggest how to resolve a conflict based on field semantics.
        """
        # Auto-mergeable fields (e.g., consent flags can be merged as union)
        if field in self.AUTO_MERGEABLE_FIELDS:
            merged = self._merge_dicts(base_val, local_val, server_val)
            return ResolutionStrategy.AUTO_MERGE, merged
        
        # Server-preferred fields (canonical data)
        if field in self.SERVER_PREFERRED_FIELDS:
            return ResolutionStrategy.USE_SERVER, server_val
        
        # Local-preferred fields (user edits)
        if field in self.LOCAL_PREFERRED_FIELDS:
            return ResolutionStrategy.USE_LOCAL, local_val
        
        # Default: Require manual resolution
        return ResolutionStrategy.MANUAL_MERGE, None
    
    def _merge_dicts(
        self, 
        base: Optional[Dict], 
        local: Optional[Dict], 
        server: Optional[Dict]
    ) -> Dict:
        """Merge dictionaries (union of keys, local wins on conflicts)"""
        result = dict(base or {})
        result.update(server or {})
        result.update(local or {})  # Local wins
        return result
    
    def _normalize_value(self, val: Any) -> Any:
        """Normalize value for comparison"""
        if val is None:
            return None
        if isinstance(val, str):
            return val.strip()
        if isinstance(val, dict):
            return json.dumps(val, sort_keys=True)
        return val
    
    def _build_merged_entity(
        self,
        base: Dict[str, Any],
        local: Dict[str, Any],
        server: Dict[str, Any],
        field_diffs: List[FieldDiff]
    ) -> Dict[str, Any]:
        """Build the suggested merged entity from field diffs"""
        merged = dict(server)  # Start with server as base
        merged["version"] = max(
            local.get("version", 0),
            server.get("version", 0)
        ) + 1
        merged["updated_at"] = datetime.utcnow().isoformat()
        
        for diff in field_diffs:
            if diff.merged_value is not None:
                # Deserialize if we serialized for comparison
                val = diff.merged_value
                if isinstance(val, str) and val.startswith("{"):
                    try:
                        val = json.loads(val)
                    except:
                        pass
                merged[diff.field_name] = val
        
        return merged
    
    def apply_resolution(
        self,
        conflict_report: ConflictReport,
        resolutions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply user's resolution choices to produce final merged entity.
        
        Args:
            conflict_report: The original conflict report
            resolutions: Dict mapping field_name to chosen value or strategy
                        e.g., {"khasra_number": "123", "area_text": "USE_LOCAL"}
        
        Returns:
            Final merged entity ready for sync
        """
        merged = dict(conflict_report.suggested_merged_entity)
        
        for field, choice in resolutions.items():
            # Find the corresponding diff
            diff = next(
                (d for d in conflict_report.field_diffs if d.field_name == field),
                None
            )
            if not diff:
                continue
            
            # Apply resolution
            if choice == "USE_LOCAL":
                merged[field] = diff.local_value
            elif choice == "USE_SERVER":
                merged[field] = diff.server_value
            elif choice == "USE_BASE":
                merged[field] = diff.base_value
            else:
                # Manual value provided
                merged[field] = choice
        
        return merged


# Singleton instance
conflict_service = ConflictResolutionService()
