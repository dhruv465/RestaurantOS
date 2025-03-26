import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItems: (state, action) => {
            const newItem = action.payload;
            
            // Check if this item already exists in the cart
            const existingItemIndex = state.findIndex(
                item => item.name === newItem.name && 
                       item.pricePerQuantity === newItem.pricePerQuantity
            );
            
            if (existingItemIndex >= 0) {
                // If the item exists, just update the quantity and price
                state[existingItemIndex].quantity += newItem.quantity;
                state[existingItemIndex].price += newItem.price;
            } else {
                // Otherwise, add a new item
                state.push(newItem);
            }
        },

        removeItem: (state, action) => {
            return state.filter(item => item.id != action.payload);
        },

        removeAllItems: (state) => {
            return [];
        },
        
        // New reducer for updating item instructions
        updateItemInstructions: (state, action) => {
            const { id, instructions } = action.payload;
            const itemIndex = state.findIndex(item => item.id == id);
            if (itemIndex !== -1) {
                state[itemIndex].instructions = instructions;
            }
        },
        
        // New reducer for marking an item as returned
        markItemAsReturned: (state, action) => {
            const { id, quantity } = action.payload;
            const itemIndex = state.findIndex(item => item.id == id);
            
            if (itemIndex !== -1) {
                // If the item exists, mark it as returned
                if (!state[itemIndex].returned) {
                    state[itemIndex].returned = quantity || state[itemIndex].quantity;
                } else {
                    // If already marked, update the returned quantity
                    state[itemIndex].returned = quantity || state[itemIndex].quantity;
                }
            }
        },
        
        // New reducer for unmarking an item as returned
        unmarkItemAsReturned: (state, action) => {
            const id = action.payload;
            const itemIndex = state.findIndex(item => item.id == id);
            
            if (itemIndex !== -1 && state[itemIndex].returned) {
                // Remove the returned flag
                delete state[itemIndex].returned;
            }
        }
    }
});

export const getTotalPrice = (state) => state.cart.reduce((total, item) => total + item.price, 0);
export const { addItems, removeItem, removeAllItems, updateItemInstructions } = cartSlice.actions;
export default cartSlice.reducer;