import { createSlice } from '@reduxjs/toolkit';

const loadCartFromStorage = () => {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : [];
};

const saveCartToStorage = (cart) => {
    localStorage.setItem("cart", JSON.stringify(cart));
};

const initialState = loadCartFromStorage();

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItems: (state, action) => {
            state.push(action.payload);
            saveCartToStorage(state);
        },

        removeItems: (state, action) => {
            const updatedCart = state.filter((item) => item.id !== action.payload);
            saveCartToStorage(updatedCart);
            return updatedCart;
        },

        removeAllItems: () => {
            localStorage.removeItem("cart");
            return [];
        }
    }
});

export const getTotalPrice = (state) =>
    state.cart.reduce((total, item) => total + item.price, 0);

export const { addItems, removeItems, removeAllItems } = cartSlice.actions;
export default cartSlice.reducer;
