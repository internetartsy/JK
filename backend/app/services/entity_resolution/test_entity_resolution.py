#!/usr/bin/env python3
"""
Test script for entity resolution
Run: python -m app.services.entity_resolution.test_entity_resolution
"""

from app.services.entity_resolution.person_deduplicator import PersonDeduplicator
from app.services.entity_resolution.farmer_id_generator import FarmerIDGenerator
import json

def test_person_deduplication():
    print("=" * 60)
    print("Testing Person Deduplication")
    print("=" * 60)
    
    deduplicator = PersonDeduplicator(threshold=0.85)
    
    # Sample persons with duplicates
    persons = [
        {'name': 'محمد احمد', 'father_name': 'عبدالرحمن', 'confidence': 0.9},
        {'name': 'Muhammad Ahmad', 'father_name': 'Abdul Rahman', 'confidence': 0.85},  # Duplicate
        {'name': 'احمد علی', 'father_name': 'محمد حسین', 'confidence': 0.88},
        {'name': 'مhmd ahmd', 'father_name': 'abdul rahman', 'confidence': 0.75},  # Duplicate with typo
        {'name': 'فاطمہ بیگم', 'father_name': 'احمد حسین', 'confidence': 0.92},
    ]
    
    # Find duplicates
    duplicate_groups = deduplicator.find_duplicates(persons)
    
    print(f"\nFound {len(duplicate_groups)} duplicate groups:")
    for i, group in enumerate(duplicate_groups):
        print(f"\nGroup {i + 1}:")
        for idx in group:
            print(f"  - {persons[idx]['name']} (confidence: {persons[idx]['confidence']})")
    
    # Merge duplicates
    for group in duplicate_groups:
        group_records = [persons[i] for i in group]
        merged = deduplicator.merge_persons(group_records)
        print(f"\nMerged record: {json.dumps(merged, indent=2, ensure_ascii=False)}")
    
    print()

def test_farmer_id_generation():
    print("=" * 60)
    print("Testing Farmer ID Generation")
    print("=" * 60)
    
    generator = FarmerIDGenerator()
    
    # Test cases
    test_cases = [
        ('محمد احمد', 'عبدالرحمن', 'چک نمبر 45'),
        ('Muhammad Ahmad', 'Abdul Rahman', 'Chak No 45'),  # Should generate same ID
        ('احمد علی', 'محمد حسین', 'موضع رحیم پور'),
        ('Fatima Begum', 'Ahmad Hussain', 'Village Rahim Pur'),
    ]
    
    print("\nGenerated Farmer IDs:")
    for name, father, village in test_cases:
        farmer_id = generator.generate_farmer_id(name, father, village, consent=True)
        print(f"{name:20s} → {farmer_id}")
    
    # Test determinism
    print("\nTesting determinism (same input should give same ID):")
    id1 = generator.generate_farmer_id('محمد احمد', 'عبدالرحمن', 'چک نمبر 45')
    id2 = generator.generate_farmer_id('muhammad ahmad', 'abdul rahman', 'chak no 45')
    print(f"ID 1: {id1}")
    print(f"ID 2: {id2}")
    print(f"Match: {id1 == id2}")
    
    # Test salted hash
    hash1 = generator.generate_salted_hash(id1)
    print(f"\nSalted hash: {hash1}")
    
    print()

def test_similarity_scores():
    print("=" * 60)
    print("Testing Name Similarity Scores")
    print("=" * 60)
    
    deduplicator = PersonDeduplicator()
    
    test_pairs = [
        ('محمد احمد', 'Muhammad Ahmad'),
        ('احمد علی', 'Ahmad Ali'),
        ('فاطمہ بیگم', 'Fatima Begum'),
        ('Muhammad Ahmad', 'Ahmad Muhammad'),  # Swapped
        ('Muhammad Ahmad', 'Muhammad Ahmed'),  # Typo
        ('Muhammad Ahmad', 'Completely Different'),
    ]
    
    print("\nSimilarity scores:")
    for name1, name2 in test_pairs:
        score = deduplicator.calculate_similarity(name1, name2)
        print(f"{name1:20s} ~ {name2:20s} = {score:.3f}")
    
    print()

if __name__ == "__main__":
    test_similarity_scores()
    test_person_deduplication()
    test_farmer_id_generation()
