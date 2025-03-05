import { createSlice } from '@reduxjs/toolkit';

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    orderList: [],
    status: 'idle',
  },
  reducers: {
    addOrder: (state, action) => {
      state.orderList.push(action.payload);
    },
    updateOrder: (state, action) => {
      const index = state.orderList.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.orderList[index] = action.payload;
      }
    },
  },
});

export const { addOrder, updateOrder } = orderSlice.actions;
export default orderSlice.reducer;