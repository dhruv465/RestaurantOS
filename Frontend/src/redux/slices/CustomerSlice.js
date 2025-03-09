import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orderId: "",
  customerName: "",
  customerPhone: "",
  guests: 0,
  table: null,
}

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setCustomer: (state, action) => {
      // Destructure only the fields that are being updated
      const { orderId, customerName, customerPhone, guests, table } = action.payload;
      
      // Only update fields that exist in the payload
      if (orderId !== undefined) state.orderId = orderId;
      if (customerName !== undefined) state.customerName = customerName;
      if (customerPhone !== undefined) state.customerPhone = customerPhone;
      if (guests !== undefined) state.guests = guests;
      
      // Preserve table data if it's not in the payload
      if (table !== undefined) {
        // Make sure we don't lose any existing table data if only partial data is provided
        state.table = { ...state.table, ...table };
      }
      
      console.log("Customer state updated in reducer:", state);
    },
    removeCustomer: (state) => {
      state.orderId = "";
      state.customerName = "";
      state.customerPhone = "";
      state.guests = 0;
      state.table = null;
    },
    updateTable: (state, action) => {
      // Check if we're switching to a new table
      const isNewTable = state.table?.tableId !== action.payload.table?.tableId;
      
      // Extract customer data from the table payload if present
      const { customerName, customerPhone, guests } = action.payload.table || {};
      
      // Update the table data
      state.table = action.payload.table;
      
      // If there's an active order with customer data, use that
      if (isNewTable && action.payload.table?.currentOrder?.data?.customerDetails) {
        const { customerDetails } = action.payload.table.currentOrder.data;
        state.customerName = customerDetails.name || "";
        state.customerPhone = customerDetails.phone || "";
        state.guests = customerDetails.guests || 1;
        state.orderId = action.payload.table.currentOrder.data._id || "";
      } 
      // If we have customer info passed with the table selection, use that
      else if (isNewTable && customerName) {
        state.customerName = customerName;
        state.customerPhone = customerPhone || "";
        state.guests = guests || 1;
        state.orderId = ""; // No order yet
      }
      // If it's a new table but no customer data, clear customer info except table
      else if (isNewTable) {
        state.orderId = "";
        state.customerName = "";
        state.customerPhone = "";
        state.guests = "";
      }
        }
  }
});

export const { setCustomer, removeCustomer, updateTable } = customerSlice.actions;
export default customerSlice.reducer;