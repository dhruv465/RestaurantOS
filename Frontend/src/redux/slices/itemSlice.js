import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addItem, getItems, updateItem, deleteItem } from '../../https';

export const fetchItems = createAsyncThunk('item/fetchItems', async () => {
    const response = await getItems();
    return response.data.data;
});

export const additemAsync = createAsyncThunk('item/additem', async (item) => {
    const response = await addItem(item);
    return response.data.data;
});

export const updateItemAsync = createAsyncThunk('item/updateItem', async ({ id, data }) => {
    const response = await updateItem(id, data);
    return response.data.data;
});

export const deleteItemAsync = createAsyncThunk('item/deleteItem', async (id) => {
    await deleteItem(id);
    return id;
});

const itemSlice = createSlice({
    name: 'item',
    initialState: {
        items: [],
        status: 'idle',
        error: null,
    },
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchItems.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchItems.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchItems.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(additemAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(additemAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items.push(action.payload);
            })
            .addCase(additemAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(updateItemAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(updateItemAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const updatedItem = action.payload;
                const index = state.items.findIndex(item => item._id === updatedItem._id);
                if (index !== -1) {
                    state.items[index] = updatedItem;
                }
            })
            .addCase(updateItemAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(deleteItemAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(deleteItemAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = state.items.filter(item => item._id !== action.payload);
            })
            .addCase(deleteItemAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
    },
});


export const selectItems = (state) => state.item.items;
export const selectItemStatus = (state) => state.item.status;
export const selectItemError = (state) => state.item.error;

export default itemSlice.reducer;
