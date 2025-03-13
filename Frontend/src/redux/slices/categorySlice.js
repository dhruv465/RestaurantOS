import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addCategory, getCategories, updateCategory, deleteCategory } from '../../https'; 

export const fetchCategories = createAsyncThunk('category/fetchCategories', async () => {
  const response = await getCategories();
  return response.data.data; 
});

export const addCategoryAsync = createAsyncThunk('category/addCategory', async (category) => {
  const response = await addCategory(category);
  return response.data.data; 
});

export const updateCategoryAsync = createAsyncThunk('category/updateCategory', async ({ id, data }) => {
  const response = await updateCategory(id, data);
  return response.data.data; 
});

export const deleteCategoryAsync = createAsyncThunk('category/deleteCategory', async (id) => {
  await deleteCategory(id);
  return id;
});

const categorySlice = createSlice({
  name: 'category',
  initialState: {
    categories: [],
    status: 'idle', 
    error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addCategoryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addCategoryAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.categories.push(action.payload);
      })
      .addCase(addCategoryAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(updateCategoryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateCategoryAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedCategory = action.payload;
        const index = state.categories.findIndex(category => category._id === updatedCategory._id);
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
      })
      .addCase(updateCategoryAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(deleteCategoryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteCategoryAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.categories = state.categories.filter(category => category._id !== action.payload);
      })
      .addCase(deleteCategoryAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

// categorySlice.js
export const selectCategories = (state) => state.category?.categories || [];
export const selectCategoryStatus = (state) => state.category?.status; 
export const selectCategoryError = (state) => state.category.error;

export default categorySlice.reducer;
