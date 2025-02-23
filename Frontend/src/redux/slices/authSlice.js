import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isAuth: true, // Default to false, can be updated based on login status
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state) => {
            state.isAuth = true; // Set isAuth to true on login
        },
        logout: (state) => {
            state.isAuth = false; // Set isAuth to false on logout
        },
    },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
