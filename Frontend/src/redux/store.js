import { configureStore } from "@reduxjs/toolkit";
import customerSlice from "./slices/CustomerSlice";
import cartSlice from "./slices/CartSlice";
import userSlice from "./slices/userSlice";
const store = configureStore({
    reducer:{
        customer: customerSlice,
        cart: cartSlice,
        user: userSlice,
    },

    devTools: import.meta.env.NODE_ENV !== "production",
});

export default store;
