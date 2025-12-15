import client from '../api/client';

export const TransferService = {
    /**
     * Get Transfer Details
     * GET /api/v1/ownership/{transfer_id}
     */
    async getTransferDetails(transferId: string) {
        try {
            console.log(`[Transfer] Fetching details for ${transferId}`);
            const response = await client.get(`/ownership/${transferId}`);
            console.log('[Transfer] Details success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[Transfer] Fetch failed:', error);
            throw error;
        }
    }
};
