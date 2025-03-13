import { configureStore } from "@reduxjs/toolkit";
import customerSlice from "./slices/customerSlice";
import cartSlice from "./slices/cartSlice";
import userSlice from "./slices/userSlice";
import categorySlice from "./slices/categorySlice"; // Import categorySlice
import itemSlice from "./slices/itemSlice"; // Import itemSlice

const store = configureStore({
    reducer: {
        customer: customerSlice,
        cart: cartSlice,
        user: userSlice,
        category: categorySlice, // Add categorySlice to the reducer
        item: itemSlice, // Add itemSlice to the reducer
    },
    devTools: import.meta.env.NODE_ENV !== "production",
});

export default store;
