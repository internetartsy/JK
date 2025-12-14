import client from './api';

export interface LandBucket {
    id: string;
    village: string;
    surveyNo: string;
    area: string;
    selected: boolean;
}

export const FarmerService = {
    // Check Aadhaar Consent (New)
    createConsent: async (aadhaar: string, farmerId: string) => {
        try {
            const response = await client.post('/consent/aadhaar', {
                farmer_id: farmerId,
                aadhaar_number: aadhaar,
                consent_purpose: 'Land Linkage Discovery'
            });
            return response.data;
        } catch (error) {
            console.error("Consent Creation Failed", error);
            throw error;
        }
    },

    // Get Holdings (Matches Backend: GET /farmer/{farmer_id}/landholdings)
    getLandHoldings: async (farmerId: string) => {
        try {
            const response = await client.get(`/farmer/${farmerId}/landholdings`);
            return response.data;
        } catch (error) {
            console.error("Get Holdings Failed", error);
            throw error;
        }
    },

    // Legacy / Mock Methods (Preserved for compatibility if needed, but marked deprecated)
    // Step 1: Discover Lands
    discoverLands: async (aadhaar: string, mobile: string, name: string) => {
        try {
            // Note: This endpoint (/farmer/discovery) likely needs to be implemented on backend 
            // or replaced by the Consent Flow above.
            const response = await client.post('/farmer/discovery', {
                aadhaar_number: aadhaar,
                mobile_number: mobile,
                name: name
            });
            return response.data;
        } catch (error) {
            console.error("Discovery Failed", error);
            throw error;
        }
    },

    // Step 3: Register
    register: async (payload: {
        name: string;
        mobile_number: string;
        aadhaar_number: string;
        claimed_ror_numbers: string[];
        face_auth_image: string | null;
        manual_lands: any[];
    }) => {
        try {
            const response = await client.post('/farmer/register', payload);
            return response.data;
        } catch (error) {
            console.error("Registration Failed", error);
            throw error;
        }
    }
};
