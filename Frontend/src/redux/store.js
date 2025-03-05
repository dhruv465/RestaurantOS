import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";
import { combineReducers } from "redux";
import customerSlice from "./slices/customerSlice.js";
import cartSlice from "./slices/cartSlice";
import userSlice from "./slices/userSlice";

const persistConfig = {
    key: "root",
    storage,
    whitelist: ["customer", "cart"], // Persist only customer and cart
};

const rootReducer = combineReducers({
    customer: customerSlice,
    cart: cartSlice,
    user: userSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    devTools: import.meta.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
export default store;
