import axios from 'axios';

export interface ReviewTask {
    id: string;
    document_id: string;
    document_type: string;
    confidence_score: number;
    extracted_fields: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
    assigned_to?: string;
    created_at?: string;
}

const API_URL = '/api/v1/reviews';

export const reviewService = {
    getPendingReviews: async (): Promise<ReviewTask[]> => {
        const response = await axios.get(`${API_URL}/pending`);
        return response.data;
    },

    approveReview: async (id: string, correctedData?: Record<string, any>): Promise<ReviewTask> => {
        // In the future, send correctedData to backend
        const response = await axios.post(`${API_URL}/${id}/approve`, correctedData);
        return response.data;
    },

    rejectReview: async (id: string): Promise<ReviewTask> => {
        const response = await axios.post(`${API_URL}/${id}/reject`);
        return response.data;
    }
};
