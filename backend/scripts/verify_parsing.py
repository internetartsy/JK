from app.services.extraction.girdawari_extractor import GirdawariExtractor
import logging
import json

# Setup Logger
logging.basicConfig(level=logging.INFO)

def test_parsing_rules():
    print("--- Testing Jamabandi Parsing Rules ---")
    
    extractor = GirdawariExtractor()
    
    # 1. Test Person Details Parsing (User provided example)
    # "kasht sahid v singh pisar attar singh kaum sukh sakindeh gair morosi"
    raw_text = "kasht sahid v singh pisar attar singh kaum sukh sakindeh gair morosi"
    print(f"\n1. input: {raw_text}")
    
    parsed = extractor._parse_person_details(raw_text)
    print("Output:")
    print(json.dumps(parsed, indent=2))
    
    # Assertions
    assert "sahid v singh" in parsed["name"].lower()
    assert "attar singh" in parsed["parent"].lower()
    assert "sukh" in parsed["caste"].lower()
    assert "gair morosi" in parsed["remarks"].lower()
    print("✅ Person details parsed correctly!")
    
    # 2. Test Row Expansion (Khasra Splitting)
    print(f"\n2. Testing Khasra Expansion")
    fields_list = [
        {"khasra_number": "156, 157", "owner_name": "Test Owner", "area": 10},
        {"khasra_number": "158", "owner_name": "Single Owner", "area": 5}
    ]
    print(f"Input: {fields_list}")
    
    expanded = extractor._expand_rows(fields_list)
    print("Output:")
    print(json.dumps(expanded, indent=2))
    
    # Assertions
    assert len(expanded) == 3 # 156, 157, 158
    assert expanded[0]["khasra_number"] == "156"
    assert expanded[1]["khasra_number"] == "157"
    assert expanded[0]["owner_name"] == "Test Owner"
    print("✅ Rows expanded correctly!")

if __name__ == "__main__":
    test_parsing_rules()
