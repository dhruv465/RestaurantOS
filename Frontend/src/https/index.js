import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
        Accept: "application/json"
    }
});

//Api endpoints

export const login = (data) => api.post('/api/user/login', data);
export const register = (data) => api.post('/api/user/register', data);
export const getUserData = () => api.get('/api/user');
export const logout = () => api.post('/api/user/logout');

//Table endpoints
export const addTable = (data) => api.post('/api/table', data);
export const getTables = () => api.get('/api/table');
export const updateTable = ({ tableId, ...tableData }) => api.put(`/api/table/${tableId}`, tableData);
export const deleteTable = (tableId) => api.delete(`/api/table/${tableId}`);

// Order API endpoints
export const addOrder = (data) => api.post('/api/order/', data);
export const getOrders = () => api.get('/api/order');
export const updateOrderStatus = ({ orderId, orderStatus }) => api.put(`/api/order/${orderId}`, { orderStatus });
export const getOrderById = (orderId) => api.get(`/api/order/${orderId}`); // Added getOrderById function
export const updateOrder = (reqData) => {
    return api.put(`api/orders/${reqData.orderId}`, reqData);
}; 

// Payment API endpoints
export const createOrderRazorpay = (data) => api.post('/api/payment/create-order', data);
export const verifyPaymentRazorpay = (data) => api.post('/api/payment/verify-payment', data);


// Category API endpoints
export const addCategory = (data) => api.post('/api/categories', data);
export const getCategories = () => api.get('/api/categories');
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

// Item API endpoints 
export const addItem = (data) => api.post('/api/items', data);
export const getItems = () => api.get('/api/items');
export const getItemById = (id) => api.get(`/api/items/${id}`);
export const updateItem = (id, data) => api.put(`/api/items/${id}`, data);
export const deleteItem = (id) => api.delete(`/api/items/${id}`);
