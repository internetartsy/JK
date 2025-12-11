import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1', // Relative path for proxy
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

// Types
export interface Person {
    id: string;
    name_urdu: string;
    name_english: string;
    confidence: number;
    consent_flags?: Record<string, boolean>;
}

export interface LandParcel {
    id: string;
    village_id: string;
    khasra_number: string;
    area_text: string;
    area_geom: number;
    status: 'submitted' | 'under_review' | 'escalated' | 'rejected' | 'process_debt' | 'approved' | 'blockchain_recorded' | 'signing' | 'active' | 'disputed' | 'inactive';
    version: number;
}

export interface FeatureCollection {
    type: "FeatureCollection";
    features: Array<{
        type: "Feature";
        properties: Record<string, unknown>;
        geometry: {
            type: string;
            coordinates: unknown[];
        };
    }>;
}

export interface ReviewTask {
    id: string;
    document_id: string;
    document_type: 'Girdawari' | 'Khasra';
    confidence_score: number;
    extracted_fields: Record<string, string | number | boolean | null>;
    status: 'Pending' | 'Approved' | 'Rejected';
    assigned_to?: string;
}

export interface DashboardStats {
    totalParcels: number;
    activeParcels: number;
    disputedParcels: number;
    totalFarmers: number;
    pendingReviews: number;
    ocrAccuracy: number;
}

// API Functions
export const personApi = {
    getAll: (skip = 0, limit = 100) =>
        apiClient.get<Person[]>(`/persons/?skip=${skip}&limit=${limit}`),

    getById: (id: string) =>
        apiClient.get<Person>(`/persons/${id}`),

    create: (data: Omit<Person, 'id'>) =>
        apiClient.post<Person>('/persons/', data),

    delete: (id: string) =>
        apiClient.delete(`/persons/${id}`),
};

export const parcelApi = {
    getAll: async (params?: { village_id?: string; khasra_number?: string; skip?: number; limit?: number }) => {
        const response = await apiClient.get<LandParcel[]>('/parcels/', { params });
        return response.data;
    },

    getRecent: async (limit = 5) => {
        const response = await apiClient.get<LandParcel[]>('/parcels/', { params: { limit } });
        return response.data;
    },

    getGeoJSON: async (villageId?: string) => {
        const response = await apiClient.get<FeatureCollection>('/parcels/geojson', {
            params: { village_id: villageId }
        });
        return response.data;
    },

    getById: (id: string) =>
        apiClient.get<LandParcel>(`/parcels/${id}`),

    create: (data: Omit<LandParcel, 'id'>) =>
        apiClient.post<LandParcel>('/parcels/', data),

    delete: (id: string) =>
        apiClient.delete(`/parcels/${id}`),

    getStats: async () => {
        const response = await apiClient.get<{ total_farmers: number, total_parcels: number, avg_parcels_per_farmer: number }>('/parcels/stats/farmers');
        return response.data;
    }
};

export const reviewApi = {
    getPending: async () => {
        const response = await apiClient.get<ReviewTask[]>('/reviews/pending');
        return response.data;
    },

    approve: (id: string, correctedData: Record<string, unknown> = {}) =>
        apiClient.post<ReviewTask>(`/reviews/${id}/approve`, { corrected_data: correctedData }),

    reject: (id: string) =>
        apiClient.post<ReviewTask>(`/reviews/${id}/reject`),
};

export const frappeSyncApi = {
    health: () => apiClient.get('/frappe/health'),
};

export default apiClient;
