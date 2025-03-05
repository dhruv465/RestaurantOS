import { createSlice } from "@reduxjs/toolkit";

const loadCustomerFromStorage = () => {
    const customer = localStorage.getItem("customer");
    return customer ? JSON.parse(customer) : {
        orderId: "",
        customerName: "",
        customerPhone: "",
        guests: 0,
        table: null
    };
};

const saveCustomerToStorage = (customer) => {
    localStorage.setItem("customer", JSON.stringify(customer));
};

const initialState = loadCustomerFromStorage();

const customerSlice = createSlice({
    name: "customer",
    initialState,
    reducers: {
        setCustomer: (state, action) => {
            const { name, phone, guests, table } = action.payload;
            state.orderId = `#${Date.now()}`;
            state.customerName = name;
            state.customerPhone = phone;
            state.guests = guests;
            state.table = table;
            saveCustomerToStorage(state);
        },

        removeCustomer: (state) => {
            state.customerName = "";
            state.customerPhone = "";
            state.guests = 0;
            state.table = null;
            localStorage.removeItem("customer");
        },

        updateTable: (state, action) => {
            state.table = action.payload.table;
            saveCustomerToStorage(state);
        }
    }
});

export const { setCustomer, removeCustomer, updateTable } = customerSlice.actions;
export default customerSlice.reducer;
