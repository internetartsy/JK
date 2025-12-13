POST /api/v1/ownership/initiate_transfer
{
    "plot_id": "JK-28-001-2025",
    "from_farmer_id": "JK-28-001850",
    "to_farmer_id": "JK-28-001851",
    "transfer_reason": "inheritance",
    "supporting_documents": ["deed.pdf", "death_cert.pdf"],
    "bank_details": {
        "bank_name": "State Bank of India",
        "account_number": "1234567890",
        "ifsc_code": "SBIN0001234"
    }
}

RESPONSE:
{
    "transfer_id": "TRF-2025-0001",
    "status": "SUBMITTED",
    "dashboard_color": "🔵 BLUE",
    "message": "Transfer request submitted to Verifier",
    "next_step": "Wait for Verifier Review (24-48 hours)"
}

---

PUT /api/v1/ownership/verify_documents
{
    "transfer_id": "TRF-2025-0001",
    "verifier_id": "VER-001",
    "document_status": "verified",
    "comments": "All documents authentic and complete"
}

RESPONSE:
{
    "transfer_id": "TRF-2025-0001",
    "status": "DOCUMENTS_VERIFIED",
    "dashboard_color": "🟡 YELLOW",
    "message": "Documents verified. Forwarding to Tahsildar",
    "tahsildar_assignment": "TAH-SAMBA-001",
    "tahsildar_name": "Shri Ram Kumar",
    "tahsildar_contact": "9876543210",
    "next_step": "Awaiting Tahsildar Approval"
}

---

PUT /api/v1/ownership/tahsildar_review
{
    "transfer_id": "TRF-2025-0001",
    "tahsildar_id": "TAH-SAMBA-001",
    "approval_decision": "APPROVED",
    "revenue_notes": "Ownership transfer approved as per revenue records",
    "court_reference": "NA"
}

RESPONSE:
{
    "transfer_id": "TRF-2025-0001",
    "status": "TAHSILDAR_APPROVED",
    "dashboard_color": "🟢 GREEN",
    "message": "Transfer approved by Tahsildar",
    "next_actions": [
        "Record on Blockchain",
        "Generate eSign",
        "Complete Transfer"
    ],
    "blockchain_hash": "abc123def456...",
    "blockchain_status": "ON_CHAIN",
    "next_step": "Digital Signature Generation"
}

---

POST /api/v1/ownership/generate_esign
{
    "transfer_id": "TRF-2025-0001",
    "ca_authority": "eSignTrust India Pvt Ltd",
    "signatories": ["from_farmer", "to_farmer", "tahsildar"]
}

RESPONSE:
{
    "transfer_id": "TRF-2025-0001",
    "status": "SIGNED",
    "dashboard_color": "🟢 GREEN",
    "esign_reference": "ES-2025-001850",
    "signature_timestamp": "2025-12-11T14:30:00Z",
    "message": "Transfer document digitally signed",
    "blockchain_finalization": "COMPLETE",
    "next_step": "Final Transfer Completion"
}

---

POST /api/v1/ownership/complete_transfer
{
    "transfer_id": "TRF-2025-0001",
    "completion_notes": "Transfer completed. New Farmer ID issued."
}

RESPONSE:
{
    "transfer_id": "TRF-2025-0001",
    "status": "COMPLETED",
    "dashboard_color": "🟢 GREEN",
    "new_farmer_id": "JK-28-001851",
    "farmer_id_certificate": "FID-2025-001851.pdf",
    "certificate_download_link": "/download/FID-2025-001851.pdf",
    "blockchain_final": {
        "hash": "xyz789...",
        "immutable": true,
        "verification_code": "JK-28-001:xyz789"
    },
    "message": "Ownership transfer completed successfully",
    "actions_completed": [
        "✅ Documents verified",
        "✅ Tahsildar approved",
        "✅ Recorded on blockchain (immutable)",
        "✅ Digitally signed",
        "✅ Farmer ID issued",
        "✅ Revenue records updated"
    ]
}
