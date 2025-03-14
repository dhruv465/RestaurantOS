import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createTable, getTables, updateTable, deleteTable } from '../../https';

export const fetchTables = createAsyncThunk('table/fetchTables', async () => {
  const response = await getTables();
  return response.data.data;
});

export const addTableAsync = createAsyncThunk('table/addTable', async (table) => {
  const response = await createTable(table);
  return response.data.data;
});

export const updateTableAsync = createAsyncThunk('table/updateTable', async ({ id, data }) => {
  const response = await updateTable(id, data);
  return response.data.data;
});

export const deleteTableAsync = createAsyncThunk('table/deleteTable', async (id) => {
  await deleteTable(id);
  return id;
});

const tableSlice = createSlice({
  name: 'table',
  initialState: {
    tables: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchTables.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tables = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addTableAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addTableAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tables.push(action.payload);
      })
      .addCase(addTableAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(updateTableAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateTableAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedTable = action.payload;
        const index = state.tables.findIndex(table => table._id === updatedTable._id);
        if (index !== -1) {
          state.tables[index] = updatedTable;
        }
      })
      .addCase(updateTableAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(deleteTableAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteTableAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tables = state.tables.filter(table => table._id !== action.payload);
      })
      .addCase(deleteTableAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

// tableSlice.js
export const selectTables = (state) => state.table?.tables || [];
export const selectTableStatus = (state) => state.table?.status;
export const selectTableError = (state) => state.table.error;

export default tableSlice.reducer;
