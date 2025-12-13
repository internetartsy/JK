import client from '../api/client';

export interface LandBucket {
    id: string;
    village: string;
    surveyNo: string;
    area: string;
    selected: boolean;
}

export const FarmerService = {
    // Step 1: Discover Lands
    discoverLands: async (aadhaar: string, mobile: string, name: string) => {
        try {
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
