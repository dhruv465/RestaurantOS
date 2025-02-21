import { configureStore } from "@reduxjs/toolkit";
import customerSlice from "./slices/CustomerSlice";
import cartSlice from "./slices/CartSlice";
const store = configureStore({
    reducer:{
        customer: customerSlice,
        cart: cartSlice
    },

    devTools: import.meta.env.NODE_ENV !== "production",
});

export default store;