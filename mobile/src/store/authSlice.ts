import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    user: any | null;
    role: 'OPERATOR' | 'VERIFIER' | 'TAHSILDAR' | 'FIELD_TEAM' | null;
    token: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
    role: null,
    token: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action: PayloadAction<{ user: any; token: string; role: any }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.role = action.payload.role;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.role = null;
            state.token = null;
            state.isAuthenticated = false;
        },
        setRole: (state, action: PayloadAction<any>) => {
            state.role = action.payload;
        }
    },
});

export const { loginSuccess, logout, setRole } = authSlice.actions;
export default authSlice.reducer;
