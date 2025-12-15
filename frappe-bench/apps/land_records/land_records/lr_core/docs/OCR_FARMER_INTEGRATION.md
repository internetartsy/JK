# OCR to Farmer ID Integration

## Overview
This integration automatically creates or updates `Farmer` records in Frappe based on data extracted from `OCR Result` documents. It ensures that fragmented landholdings extracted from RoR records are consolidated under a unique Farmer ID.

## Workflow

1.  **OCR Processing**: 
    - A `Document Scan` is processed by the OCR engine.
    - An `OCR Result` document is created with the `extracted_data` JSON field.
    - The `extracted_data` is expected to contain demographic details (from RoR Column 5) and associated ULPINs.

2.  **Data Extraction**:
    - The system looks for `owner_details` or `column_5` in the extracted data.
    - Key fields: `owner_name`, `father_name`, `address`.

3.  **Farmer ID Generation**:
    - A unique Farmer ID is generated using a deterministic hash of the normalized `owner_name` and `father_name`.
    - Format: `FID-01-{HASH}` (Consistent with backend logic).

4.  **Farmer Record Creation/Update**:
    - If a `Farmer` record with the generated ID does not exist, it is created.
    - Demographics (Name, Father Name, Address) are populated.
    - If the OCR result contains a `ulpin`, it is linked to the Farmer record in the `linked_parcels` table with relationship "Owner".
    - If the Farmer record already exists, the new ULPIN is appended to their landholdings if not already present.

## Technical Details

-   **Trigger**: `OCRResult.on_submit` event.
-   **File**: `apps/land_records/land_records/lr_core/doctype/ocr_result/ocr_result.py`
-   **Target DocTypes**: `OCR Result` -> `Farmer`, `Farmer Parcel Link`.

## Example Extracted Data Structure

```json
{
    "column_5": {
        "owner_name": "Rahim Khan",
        "father_name": "Salim Khan",
        "address": "Village A, District B"
    },
    "ulpin": "01051432215477"
}
```

## Future Enhancements
-   Integration with backend `FarmerIDGenerator` service via API for consistent ID generation logic across all platforms (currently replicated in Python).
-   Fuzzy matching for name resolution.

## Manual Interventions

While the system automates much of the process, the following actions can be performed manually in Frappe:

### 1. Land Parcel (ULPIN)
- **Status Updates**: Mark parcels as 'Disputed' or 'Inactive' based on field verification.
- **Data Correction**: Manually correct `Khasra Number` or `Area Text` if digital records mismatch physical RoR.
- **Ownership Status**: Update `Ownership Status` (Private/State/Common) and `Cultivation Status`.

### 2. Farmer (RoR Owner)
- **Demographic Cleanup**: Correct extraction errors in Name, Father Name, or Address.
- **Urdu Name**: Manually enter `Name (Urdu)` if required.
- **Parcel Linkage**: Manually add ULPINs to the `Linked Parcels` table for fragmented holdings not automatically detected.

### 3. Dispute Resolution
- **File Claim**: Manually create `Dispute Claim` records linked to a specific ULPIN.
- **Upload Evidence**: Attach supporting legal documents.
- **Adjudication**: Officers manually update claim status (Approved/Rejected).
