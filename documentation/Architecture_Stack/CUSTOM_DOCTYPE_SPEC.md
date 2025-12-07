# 📄 Custom Doctype Specifications

**App:** `land_records`  
**Module:** `lr_core`  
**Status:** Initial Development (Need Normalization)

---

## 1. Village
- **Path:** `lr_core/doctype/village`
- **Primary Key:** `village_name`
- **Fields:**
  - `village_name` (Data)
- **⚠️ Issues:**
  - Lacks hierarchical links (`Halqa`, `Tehsil`).
  - No geo-boundaries defined.

## 2. Land Parcel
- **Path:** `lr_core/doctype/land_parcel`
- **Primary Key:** `parcel_id`
- **Fields:**
  - `village_id` (Data) - **Should be Link**
  - `khasra_number` (Data)
  - `area_text` (Data) & `area_geom` (Float)
  - `status`, `ownership_status`, `cultivation_status` (Selects)
  - `geojson` (Long Text)
  - `tehsil`, `district` (Data) - **Denormalized**
- **Permissions:**
  - System Manager/Admin: Full Access
  - Validator: Read Only
  - Enumerator: Read/Write (Create allowed)

## 3. Farmer
- **Path:** `lr_core/doctype/farmer`
- **Primary Key:** `farmer_id`
- **Fields:**
  - `name_urdu`, `name_english`, `father_name` (Data)
  - `village` (Link: Village)
  - `aadhaar_hash` (Hidden Data)
  - `demographics`, `consent_flags`, `role_flags` (JSON)
  - `linked_parcels` (Table Link: `Farmer Parcel Link`)

## 4. Claim
- **Path:** `lr_core/doctype/claim`
- **Primary Key:** `claim_id`
- **Purpose:** Dispute resolution tracking
- **Fields:**
  - `parcel_id` (Link: Land Parcel)
  - `claim_type` (Select: Ownership, Inheritance, etc.)
  - `status` (Select: Draft, Pending, Approved)
  - `evidence_docs` (Attach)
  - `assigned_to` (Link: User)

## 5. Review Task
- **Path:** `lr_core/doctype/review_task`
- **Primary Key:** Hash
- **Fields:**
  - `document_id` (Data)
  - `document_type` (Select: Girdawari, Khasra)
  - `confidence_score` (Float)
  - `extracted_fields` (JSON)
  - `status` (Pending/Approved/Rejected)

---

## 🔍 General Observations

1.  **Normalization Gap:** `Land Parcel` uses flat text for geography (`tehsil`, `district`, `village_id`) while `Farmer` correctly uses a Link to `Village`.
2.  **Missing Hierarchy:** No doctypes exist for `Halqa` or `Tehsil`.
3.  **JSON Usage:** Heavy reliance on JSON fields for flexible data (`demographics`, `extracted_fields`), which reduces queryability but increases flexibility.
4.  **Security:** Role-based permissions are configured (Enumerator vs Validator).

## 🛠 Recommendations

1.  **Create Hierarchy:** Add `Halqa` (Revenue Circle) and `Tehsil` doctypes.
2.  **Fix Land Parcel:** Change `village_id` to `Link: Village`.
3.  **Geo-enable Village:** Add `geojson` boundary field to `Village`.
