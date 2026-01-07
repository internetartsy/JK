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
    ulpin?: string;
    village_id: string;
    khasra_number: string;
    landmark?: string;
    area_text: string;
    area_geom: number;
    status: 'submitted' | 'under_review' | 'escalated' | 'rejected' | 'process_debt' | 'approved' | 'blockchain_recorded' | 'signing' | 'active' | 'disputed' | 'inactive';
    owner_id?: string;
    owner_name?: string;
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
    getAll: async (params?: { village_id?: string; khasra_number?: string; ulpin?: string; landmark?: string; skip?: number; limit?: number }) => {
        const response = await apiClient.get<LandParcel[]>('/parcels/', { params });
        return response.data;
    },

    search: async (query: string) => {
        const response = await apiClient.get<LandParcel[]>('/parcels/search', { params: { q: query } });
        return response.data;
    },

    getRecent: async (limit = 5) => {
        const response = await apiClient.get<LandParcel[]>('/parcels/', { params: { limit } });
        return response.data;
    },

    getGeoJSON: async (villageId?: string) => {
        try {
            const filters = villageId ? [['village_id', '=', villageId]] : undefined;
            // Fetch directly from Frappe (Land Parcel DocType)
            const response = await frappeDataApi.getList('Land Parcel',
                ['name', 'parcel_id', 'geojson', 'ownership_status', 'khasra_number', 'village_id', 'area_text'],
                filters
            );

            const features = response.data.data
                .filter((p: any) => p.geojson)
                .map((p: any) => {
                    try {
                        let geom = JSON.parse(p.geojson);
                        if (geom.geometry) geom = geom.geometry;

                        return {
                            type: 'Feature',
                            properties: {
                                id: p.name,
                                ulpin: p.parcel_id,
                                status: (p.ownership_status || 'Private').toLowerCase() === 'disputed' ? 'disputed' : 'active',
                                khasra: p.khasra_number,
                                village: p.village_id,
                                owner: 'Fetch Pending',
                                farmer_id: 'View Details'
                            },
                            geometry: geom
                        };
                    } catch (e) { return null; }
                })
                .filter(Boolean);

            return {
                type: 'FeatureCollection',
                features: features as any
            };
        } catch (err) {
            console.warn("Failed to fetch Frappe GeoJSON, falling back to backend stub", err);
            const response = await apiClient.get<FeatureCollection>('/parcels/geojson', {
                params: { village_id: villageId }
            });
            return response.data;
        }
    },

    getById: (id: string) =>
        apiClient.get<LandParcel>(`/parcels/${id}`),

    create: (data: Omit<LandParcel, 'id'>) =>
        apiClient.post<LandParcel>('/parcels/', data),

    delete: (id: string) =>
        apiClient.delete(`/parcels/${id}`),

    transmit: async (id: string) => {
        const response = await apiClient.post(`/parcels/${id}/transmit`);
        return response.data;
    },

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

export const ocrApi = {
    upload: async (file: File) => {
        // Always use the Python Backend for OCR Analysis + Frappe Sync
        // The Backend (ocr.py) -> Celery -> SyncService flow handles storage & data creation
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<{ job_id: string, status: string }>('/ocr/run-async', formData);
    },
    status: (jobId: string) =>
        frappeDataApi.getResource('OCR Result', jobId)
            .then(r => ({ data: { status: r.data.data.status, result: r.data.data.extracted_data } }))
            .catch(() => apiClient.get<{ status: string, result?: any }>(`/ocr/status/${jobId}`))
};

export const frappeSyncApi = {
    health: () => apiClient.get('/frappe/health'),
};

const frappeClient = axios.create({
    baseURL: '/api', // Correctly routes to Frappe via Rust Gateway /api path
    headers: { 'Content-Type': 'application/json' }
});

export const frappeDataApi = {
    getResource: (doctype: string, name: string) => frappeClient.get(`/resource/${doctype}/${name}`),
    getList: (doctype: string, fields?: string[], filters?: any) =>
        frappeClient.get<{ data: any[] }>(`/resource/${doctype}`, {
            params: {
                fields: fields ? JSON.stringify(fields) : undefined,
                filters: filters ? JSON.stringify(filters) : undefined,
                limit_page_length: 500
            }
        }),
    create: (doctype: string, data: any) => frappeClient.post(`/resource/${doctype}`, data),
    uploadFile: (formData: FormData) => frappeClient.post('/method/upload_file', formData)
};

export const dataCleaningApi = {
    runPipeline: async (villageCode?: string) => {
        const response = await frappeClient.get('/method/land_records.lr_core.utils.data_cleaning.run_deduplication_pipeline', {
            params: { village_code: villageCode }
        });
        return response.data.message;
    }
};

export default apiClient;
