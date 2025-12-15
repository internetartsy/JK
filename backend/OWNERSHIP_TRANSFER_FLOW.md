```mermaid
stateDiagram-v2
    [*] --> FormSubmitted
    
    FormSubmitted: 📝 Operator Submits<br/>Ownership Transfer Form<br/>Status: SUBMITTED<br/>Color: 🔵 Blue
    
    FormSubmitted --> VerifyDocuments
    
    VerifyDocuments: ✓ Verifier Reviews<br/>Documents & Identity<br/>Status: UNDER_REVIEW<br/>Color: 🟡 Yellow
    
    VerifyDocuments --> DocumentsOK{Documents<br/>Valid?}
    
    DocumentsOK -->|No - Reject| DocumentsRejected
    DocumentsRejected: ❌ Documents Rejected<br/>Status: REJECTED<br/>Color: 🔴 Red<br/>Action: Return to Operator
    DocumentsRejected --> FormSubmitted
    
    DocumentsOK -->|Yes| TahsildarApproval
    
    TahsildarApproval: 🟥 TAHSILDAR APPROVAL PENDING<br/>Status: PENDING_TAHSILDAR<br/>Color: 🔴 RED (Critical)<br/>Dashboard Alert: ⚠️ Red Flag<br/><br/>Tahsildar Reviews:<br/>• Legal Authority<br/>• Ownership Rights<br/>• Revenue Records<br/>• Court References
    
    TahsildarApproval --> TahsildarDecision{Tahsildar<br/>Approves?}
    
    TahsildarDecision -->|No - Escalate| CourtReferral
    CourtReferral: ⚖️ Escalated to Court<br/>Status: COURT_REFERRED<br/>Color: 🟠 Orange<br/>Action: Court Decision Required
    CourtReferral --> [*]
    
    TahsildarDecision -->|Yes| BlockchainEntry
    BlockchainEntry: ⛓️ Record on Blockchain<br/>Status: ON_BLOCKCHAIN<br/>Color: 🟣 Purple<br/>Action: Immutable Record Created
    
    BlockchainEntry --> eSignGeneration
    eSignGeneration: 🔐 eSign Generation<br/>Status: SIGNING<br/>Color: 🔷 Light Blue<br/>Action: Digital Signature Applied<br/>CCA: Digital Signature Authority
    
    eSignGeneration --> SignatureComplete
    SignatureComplete: ✅ Signature Complete<br/>Status: SIGNED<br/>Color: 🟢 Green
    
    SignatureComplete --> CompleteTransfer
    CompleteTransfer: ✨ Transfer Completed<br/>Status: COMPLETED<br/>Color: 🟢 Green<br/>Action:<br/>• New Farmer ID Issued<br/>• Revenue Records Updated<br/>• Blockchain Finalized<br/>• Certificate Generated
    
    CompleteTransfer --> [*]

    style TahsildarApproval fill:#ff0000,stroke:#000,color:#fff,font-weight:bold
    style CourtReferral fill:#ff6600,stroke:#000,color:#fff
    style DocumentsRejected fill:#ff0000,stroke:#000,color:#fff
```
