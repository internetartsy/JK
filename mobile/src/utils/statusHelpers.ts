import { StatusColor } from "../components/ProcessStatus";

export type ProcessStatusType =
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ESCALATED'
    | 'REJECTED'
    | 'PROCESS_DEBT'
    | 'APPROVED'
    | 'BLOCKCHAIN_RECORDED'
    | 'SIGNING';

interface StatusConfig {
    color: StatusColor;
    icon: string;
    defaultText: string;
    timelineEstimate: string;
    notification?: {
        title: string;
        body: string;
    };
}

export const getStatusConfig = (status: ProcessStatusType, transferId: string = "UNKNOWN"): StatusConfig => {
    switch (status) {
        case 'SUBMITTED':
            return {
                color: 'BLUE',
                icon: 'Info',
                defaultText: 'Initial submission received, awaiting processing.',
                timelineEstimate: 'Expected: 1-2 days'
            };
        case 'UNDER_REVIEW':
            return {
                color: 'YELLOW',
                icon: 'Clock',
                defaultText: 'Your application is currently being reviewed by the Verifier.',
                timelineEstimate: 'Expected: 2-3 days'
            };
        case 'ESCALATED':
            return {
                color: 'ORANGE',
                icon: 'Gavel',
                defaultText: 'Dispute escalated to higher authority/court.',
                timelineEstimate: 'Timeline: 2-3 months',
                notification: {
                    title: "⚠️ Status Update",
                    body: `Transfer ${transferId} has been escalated to court.`
                }
            };
        case 'REJECTED':
            return {
                color: 'RED',
                icon: 'AlertCircle',
                defaultText: 'Document rejected. Please check comments and re-upload.',
                timelineEstimate: 'Action Required: Within 48 hours',
                notification: {
                    title: "⚠️ Action Required",
                    body: `Your transfer ${transferId} needs attention.`
                }
            };
        case 'PROCESS_DEBT':
            return {
                color: 'BLACK',
                icon: 'AlertTriangle',
                defaultText: 'Critical Issue: Multiple claimants or missing documentation detected.',
                timelineEstimate: 'URGENT: Contact immediately',
                notification: {
                    title: "🚨 CRITICAL - Process Debt",
                    body: "Multiple claimants detected. Contact Tahsildar immediately."
                }
            };
        case 'APPROVED':
            return {
                color: 'GREEN',
                icon: 'CheckCircle2',
                defaultText: 'Ownership transfer approved successfully.',
                timelineEstimate: 'Process Completed',
                notification: {
                    title: "✅ Success!",
                    body: "Your ownership transfer is complete."
                }
            };
        case 'BLOCKCHAIN_RECORDED':
            return {
                color: 'PURPLE',
                icon: 'Link2',
                defaultText: 'Entry permanently recorded on immutable blockchain ledger.',
                timelineEstimate: 'Permanent Record'
            };
        case 'SIGNING':
            return {
                color: 'LIGHT_BLUE',
                icon: 'PenTool',
                defaultText: 'Digital signature generation in progress.',
                timelineEstimate: 'Expected: 1-2 hours'
            };
        default:
            return {
                color: 'BLUE',
                icon: 'Info',
                defaultText: 'Status unknown',
                timelineEstimate: 'Unknown'
            };
    }
};
