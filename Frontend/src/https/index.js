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
export const getSetupStatus = () => api.get('/api/user/setup');
export const getUserData = () => api.get('/api/user');
export const logout = () => api.post('/api/user/logout');

//Table endpoints
export const addTable = (data) => api.post('/api/table', data);
export const getTables = () => api.get('/api/table');
export const updateTable = ({ tableId, ...tableData }) => api.put(`/api/table/${tableId}`, tableData);
export const deleteTable = (tableId) => api.delete(`/api/table/${tableId}`);
export const saveTableLayout = (tables) => api.patch('/api/table/layout', { tables });

// Order API endpoints
export const addOrder = (data) => api.post('/api/order/', data);
export const getOrders = () => api.get('/api/order');
export const updateOrderStatus = ({ orderId, orderStatus }) => api.put(`/api/order/${orderId}`, { orderStatus });
export const getOrderById = (orderId) => api.get(`/api/order/${orderId}`);
export const updateOrder = ({ orderId, ...data }) => api.put(`/api/order/${orderId}`, data);
export const deleteItemFromOrder = (orderId, itemId) => api.delete(`/api/order/${orderId}/items/${itemId}`);
export const previewOrderPrice = (items) => api.post('/api/order/price', { items });
export const cancelOrder = ({ orderId, reason }) => api.post(`/api/order/${orderId}/cancel`, { reason });
export const moveOrder = ({ orderId, tableId }) => api.post(`/api/order/${orderId}/move`, { tableId });
export const mergeOrder = ({ orderId, fromOrderId }) => api.post(`/api/order/${orderId}/merge`, { fromOrderId });
export const checkoutOrder = ({ orderId, ...data }) => api.post(`/api/order/${orderId}/checkout`, data);

// Payment API endpoints
export const createOrderRazorpay = ({ orderId }) => api.post('/api/payment/create-order', { orderId });
export const verifyPaymentRazorpay = (data) => api.post('/api/payment/verify-payment', data);
export const refundOrder = (data) => api.post('/api/payment/refund', data);


// Category API endpoints
export const createCategory = (data) => api.post('/api/categories', data);
export const getCategories = () => api.get('/api/categories');
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

// Item API endpoints 
export const addItem = (data) => api.post('/api/items', data);
export const getItems = () => api.get('/api/items');
export const getItemById = (id) => api.get(`/api/items/${id}`);
export const updateItem = (id, data) => api.put(`/api/items/${id}`, data);
export const deleteItem = (id) => api.delete(`/api/items/${id}`);
export const uploadItemImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return api.post('/api/items/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Settings, staff and audit
export const getSettings = () => api.get('/api/settings');
export const updateSettings = (data) => api.patch('/api/settings', data);
export const getAuditLogs = (params) => api.get('/api/settings/audit', { params });
export const getStaff = () => api.get('/api/user/staff');
export const createStaff = (data) => api.post('/api/user/staff', data);
export const updateStaff = ({ id, ...data }) => api.patch(`/api/user/staff/${id}`, data);

// Add-ons (modifier groups)
export const getModifierGroups = () => api.get('/api/modifier-groups');
export const createModifierGroup = (data) => api.post('/api/modifier-groups', data);
export const updateModifierGroup = (id, data) => api.put(`/api/modifier-groups/${id}`, data);
export const deleteModifierGroup = (id) => api.delete(`/api/modifier-groups/${id}`);

// Guest QR ordering (staff side)
export const rotateTableQr = (tableId) => api.post(`/api/table/${tableId}/qr`);
export const newGuestCode = (tableId) => api.post(`/api/table/${tableId}/guest-code`);
export const acceptGuestOrder = (orderId) => api.post(`/api/order/${orderId}/accept`);
export const declineGuestOrder = ({ orderId, reason }) => api.post(`/api/order/${orderId}/decline`, { reason });
export const getTableRequests = () => api.get('/api/table/requests');
export const resolveTableRequest = (id) => api.patch(`/api/table/requests/${id}`);

// Guest QR ordering (guest's phone, no staff login)
export const getPublicMenu = (qrToken) => api.get(`/api/public/menu/${qrToken}`);
export const joinTable = ({ qrToken, code }) => api.post(`/api/public/menu/${qrToken}/join`, { code });
export const placeGuestOrder = (data) => api.post('/api/public/order', data);
export const getGuestOrders = () => api.get('/api/public/orders');
export const callStaff = (type) => api.post('/api/public/request', { type });

// Reports
export const getSalesReport = (params) => api.get('/api/reports/sales', { params });

// Inventory
export const getIngredients = () => api.get('/api/inventory/ingredients');
export const createIngredient = (data) => api.post('/api/inventory/ingredients', data);
export const updateIngredient = (id, data) => api.patch(`/api/inventory/ingredients/${id}`, data);
export const adjustStock = (id, data) => api.post(`/api/inventory/ingredients/${id}/adjust`, data);
export const receiveStock = (id, data) => api.post(`/api/inventory/ingredients/${id}/receive`, data);
export const getStockUsage = (params) => api.get('/api/inventory/usage', { params });
export const logWaste = (data) => api.post('/api/inventory/waste', data);
export const stockTake = (data) => api.post('/api/inventory/stock-take', data);
export const getMovements = (params) => api.get('/api/inventory/movements', { params });
export const getShoppingList = () => api.get('/api/inventory/shopping-list');
export const getRecipes = () => api.get('/api/inventory/recipes');
export const saveRecipe = (itemId, data) => api.put(`/api/inventory/recipes/${itemId}`, data);
export const getSuppliers = () => api.get('/api/inventory/suppliers');
export const createSupplier = (data) => api.post('/api/inventory/suppliers', data);
export const getPurchaseOrders = () => api.get('/api/inventory/purchase-orders');
export const createPurchaseOrder = (data) => api.post('/api/inventory/purchase-orders', data);
export const updatePurchaseOrder = (id, data) => api.patch(`/api/inventory/purchase-orders/${id}`, data);
export const receivePurchaseOrder = (id, data) => api.post(`/api/inventory/purchase-orders/${id}/receive`, data);

// Kitchen display
export const getKots = (params) => api.get('/api/kds/tickets', { params });
export const updateKotStatus = ({ id, from, to }) => api.patch(`/api/kds/tickets/${id}/status`, { from, to });
export const setKotPriority = ({ id, isPriority }) => api.patch(`/api/kds/tickets/${id}/priority`, { isPriority });

// Team / HR
export const setOwnPin = (data) => api.post('/api/hr/pin', data);
export const getPinUsers = () => api.get('/api/hr/pin-users');
export const pinSwitch = (data) => api.post('/api/hr/pin-switch', data);
// Trusted-device PIN sign-in (works without a staff session)
export const getDevicePinUsers = () => api.get('/api/user/pin-users');
export const pinLogin = (data) => api.post('/api/user/pin-login', data);
export const pinClock = (data) => api.post('/api/user/pin-clock', data);
export const forgetDevice = () => api.post('/api/user/forget-device');
export const getHrStaff = () => api.get('/api/hr/staff');
export const getMyAttendance = () => api.get('/api/hr/attendance/me');
export const clockIn = () => api.post('/api/hr/attendance/clock-in');
export const clockOut = (data) => api.post('/api/hr/attendance/clock-out', data);
export const getAttendance = (params) => api.get('/api/hr/attendance', { params });
export const addAttendance = (data) => api.post('/api/hr/attendance', data);
export const editAttendance = (id, data) => api.patch(`/api/hr/attendance/${id}`, data);
export const getShifts = (params) => api.get('/api/hr/shifts', { params });
export const saveShift = (id, data) => (id ? api.put(`/api/hr/shifts/${id}`, data) : api.post('/api/hr/shifts', data));
export const deleteShift = (id) => api.delete(`/api/hr/shifts/${id}`);
export const getLeave = () => api.get('/api/hr/leave');
export const requestLeave = (data) => api.post('/api/hr/leave', data);
export const decideLeave = (id, data) => api.patch(`/api/hr/leave/${id}`, data);
export const getPayProfiles = () => api.get('/api/hr/payroll/profiles');
export const savePayProfile = (userId, data) => api.put(`/api/hr/payroll/profiles/${userId}`, data);
export const getPayrollRuns = () => api.get('/api/hr/payroll/runs');
export const createPayrollRun = (data) => api.post('/api/hr/payroll/runs', data);
export const payrollRunAction = (id, action) => api.post(`/api/hr/payroll/runs/${id}/${action}`);
export const deletePayrollRun = (id) => api.delete(`/api/hr/payroll/runs/${id}`);

// Dashboard and accounting
export const getDashboard = () => api.get('/api/reports/dashboard');
export const getExpenses = (params) => api.get('/api/accounting/expenses', { params });
export const addExpense = (data) => api.post('/api/accounting/expenses', data);
export const editExpense = (id, data) => api.patch(`/api/accounting/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/api/accounting/expenses/${id}`);
export const getClosingPreview = (params) => api.get('/api/accounting/closing/preview', { params });
export const getClosings = (params) => api.get('/api/accounting/closings', { params });
export const closeDay = (data) => api.post('/api/accounting/closings', data);
export const getPnl = (params) => api.get('/api/accounting/pnl', { params });
export const getGst = (params) => api.get('/api/accounting/gst', { params });



// Scheduled orders
export const releaseOrder = (id) => api.post(`/api/order/${id}/release`);
