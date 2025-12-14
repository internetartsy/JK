import sys
import os
import json
import importlib.util

# 1. Setup Environment to load the App Code
current_dir = os.getcwd()
sys.path.append(current_dir)

# 2. Load the 'RoRParser' Module from the codebase
file_path = "frappe-bench/apps/land_records/land_records/lr_core/utils/ror_parser.py"
spec = importlib.util.spec_from_file_location("ror_parser", file_path)
ror_parser_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ror_parser_mod)
RoRParser = ror_parser_mod.RoRParser

def execute_logic():
    print("\n=======================================================")
    print(" 🚜 J&K LAND RECORDS: AUTOMATED PARSING ENGINE TEST     ")
    print("=======================================================")

    # TEST DATA: Row with 3 plots and complex Urdu string
    input_row = {
        "col_2": "10", 
        "col_5": "Ahmed Ali Walad Rahim Khan Sakin Jammu Kaum Rajput", 
        "col_7": "50, 51, 52", # <--- Fragmentation (3 plots)
        "col_8": "10 Marla"
    }

    print(f"\n[INPUT] Raw Data from OCR:")
    print(json.dumps(input_row, indent=2))

    # EXECUTE PARSER
    print("\n[PROCESSING] Running RoRParser.process_jamabandi_batch()...")
    normalized_rows = RoRParser.process_jamabandi_batch([input_row])

    # DISPLAY OUTPUT
    print(f"\n[OUTPUT] Generated {len(normalized_rows)} Normalized Records:")
    print("-------------------------------------------------------")
    for i, row in enumerate(normalized_rows, 1):
        print(f"Record #{i}:")
        print(f"  • Plot ID (Khasra) : {row.get('col_7')}")
        print(f"  • Owner Name       : {row.get('name')}")
        print(f"  • Relationship     : {row.get('relationship')} ({row.get('parentage')})")
        print(f"  • Demographics     : {row.get('caste')}, {row.get('residence')}")
        print("-------------------------------------------------------")

    if len(normalized_rows) == 3 and normalized_rows[0]['relationship'] == 'Son of':
        print("\n✅ SUCCESS: Row splitting and Urdu mapping are FUNCTIONAL.")
    else:
        print("\n❌ FAILED: Logic did not produce expected output.")

if __name__ == "__main__":
    execute_logic()
