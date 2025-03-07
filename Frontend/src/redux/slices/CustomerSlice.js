import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    orderId: "",
    customerName: "",
    customerPhone: "",
    guests: 0,
    table: null,
    order: { // Add order property to the initial state
        bills: null,
        items: []
    }  
}

const customerSlice = createSlice({
    name: "customer",
    initialState,
    reducers: {
        setCustomer: (state, action) => {
            const { name, phone, guests, order } = action.payload;
            state.orderId = `#${Date.now()}`;
            state.customerName = name;
            state.customerPhone = phone;
            state.guests = guests;
            state.order = order; // Set the order details in the state

        },

        removeCustomer: (state) => {
            state.customerName = "";
            state.customerPhone = "";
            state.guests = 0;
            state.table = null;
        },

        updateTable: (state, action) => {
            state.table = action.payload.table; 
        }
    }
})

export const { setCustomer, removeCustomer, updateTable } = customerSlice.actions;
export default customerSlice.reducer;