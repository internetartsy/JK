import client from '../api/client';

export const DisputeService = {
    /**
     * Transition a dispute to a new status
     * POST /api/v1/disputes/{claim_id}/transition
     */
    async transitionDispute(claimId: string, action: string, payload: any = {}) {
        try {
            console.log(`[Dispute] Transitioning ${claimId} with action: ${action}`);
            const response = await client.post(`/disputes/${claimId}/transition`, {
                action,
                ...payload
            });
            console.log('[Dispute] Transition success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[Dispute] Transition failed:', error);
            throw error;
        }
    }
};
