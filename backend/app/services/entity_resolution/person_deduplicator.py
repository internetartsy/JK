from typing import List, Dict, Any, Optional, Tuple
from difflib import SequenceMatcher
import re

class PersonDeduplicator:
    """Deduplicate person records using fuzzy name matching"""
    
    def __init__(self, threshold: float = 0.85):
        """
        Initialize deduplicator
        
        Args:
            threshold: Similarity threshold (0-1) for considering records as duplicates
        """
        self.threshold = threshold
    
    def normalize_name(self, name: str) -> str:
        """Normalize name for comparison"""
        if not name:
            return ""
        
        # Convert to lowercase
        name = name.lower()
        
        # Remove common titles and honorifics
        titles = ['mr', 'mrs', 'ms', 'dr', 'prof', 'mian', 'chaudhry', 'malik', 'sheikh']
        for title in titles:
            name = re.sub(rf'\b{title}\.?\s+', '', name)
        
        # Remove extra whitespace
        name = re.sub(r'\s+', ' ', name).strip()
        
        return name
    
    def calculate_similarity(self, name1: str, name2: str) -> float:
        """
        Calculate similarity between two names using multiple methods
        
        Returns:
            Similarity score (0-1)
        """
        if not name1 or not name2:
            return 0.0
        
        # Normalize names
        n1 = self.normalize_name(name1)
        n2 = self.normalize_name(name2)
        
        # Exact match
        if n1 == n2:
            return 1.0
        
        # Sequence matcher (considers character-level similarity)
        seq_sim = SequenceMatcher(None, n1, n2).ratio()
        
        # Token-based similarity (for names with different word orders)
        tokens1 = set(n1.split())
        tokens2 = set(n2.split())
        if tokens1 and tokens2:
            token_sim = len(tokens1 & tokens2) / len(tokens1 | tokens2)
        else:
            token_sim = 0.0
        
        # Combine similarities (weighted average)
        combined_sim = (seq_sim * 0.6) + (token_sim * 0.4)
        
        return combined_sim
    
    def find_duplicates(
        self,
        persons: List[Dict[str, Any]],
        name_field: str = 'name',
        father_name_field: str = 'father_name'
    ) -> List[List[int]]:
        """
        Find duplicate person records
        
        Args:
            persons: List of person records
            name_field: Field name for person name
            father_name_field: Field name for father's name
        
        Returns:
            List of duplicate groups (each group is a list of indices)
        """
        n = len(persons)
        visited = [False] * n
        duplicate_groups = []
        
        for i in range(n):
            if visited[i]:
                continue
            
            group = [i]
            visited[i] = True
            
            for j in range(i + 1, n):
                if visited[j]:
                    continue
                
                # Calculate similarity
                name_sim = self.calculate_similarity(
                    persons[i].get(name_field, ''),
                    persons[j].get(name_field, '')
                )
                
                # Also check father's name if available
                father_sim = 0.0
                if father_name_field in persons[i] and father_name_field in persons[j]:
                    father_sim = self.calculate_similarity(
                        persons[i].get(father_name_field, ''),
                        persons[j].get(father_name_field, '')
                    )
                
                # Combined score (name is more important)
                combined_score = (name_sim * 0.7) + (father_sim * 0.3)
                
                if combined_score >= self.threshold:
                    group.append(j)
                    visited[j] = True
            
            if len(group) > 1:
                duplicate_groups.append(group)
        
        return duplicate_groups
    
    def merge_persons(self, persons: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Merge duplicate person records into a single canonical record
        
        Strategy:
        - Use most complete/confident record as base
        - Combine metadata from all records
        """
        if not persons:
            return {}
        
        # Sort by confidence/completeness
        sorted_persons = sorted(
            persons,
            key=lambda p: (p.get('confidence', 0), len(str(p.get('name', '')))),
            reverse=True
        )
        
        # Use highest confidence record as base
        merged = sorted_persons[0].copy()
        
        # Track all source IDs
        merged['source_ids'] = [p.get('id') for p in persons if 'id' in p]
        
        # Combine alternate names
        all_names = set()
        for p in persons:
            if p.get('name'):
                all_names.add(p['name'])
            if p.get('name_english'):
                all_names.add(p['name_english'])
        
        merged['alternate_names'] = list(all_names)
        
        return merged
