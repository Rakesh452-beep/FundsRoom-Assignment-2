import client from './client';

export const authApi = {
  login: (data) => client.post('/auth/login', data).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};

export const customerApi = {
  list: (params = {}) => client.get('/customers', { params }).then((r) => r.data),
  create: (data) => client.post('/customers', data).then((r) => r.data),
};

export const enquiryApi = {
  list: (params = {}) => client.get('/enquiries', { params }).then((r) => r.data),
  get: (id) => client.get(`/enquiries/${id}`).then((r) => r.data),
  create: (data) => client.post('/enquiries', data).then((r) => r.data),
  updateStatus: (id, status) => client.patch(`/enquiries/${id}/status`, { status }).then((r) => r.data),
};

export const productApi = {
  list: () => client.get('/products').then((r) => r.data),
};

export const inventoryApi = {
  list: () => client.get('/inventory').then((r) => r.data),
  adjust: (productId, quantity) => client.patch(`/inventory/${productId}`, { quantity }).then((r) => r.data),
};

export const quotationApi = {
  list: (params = {}) => client.get('/quotations', { params }).then((r) => r.data),
  get: (id) => client.get(`/quotations/${id}`).then((r) => r.data),
  create: (data) => client.post('/quotations', data).then((r) => r.data),
  updateStatus: (id, status) => client.patch(`/quotations/${id}/status`, { status }).then((r) => r.data),
  convert: (id) => client.post(`/quotations/${id}/convert`).then((r) => r.data),
  pdfUrl: (id) => `/api/quotations/${id}/pdf`,
};

export const salesOrderApi = {
  list: (params = {}) => client.get('/sales-orders', { params }).then((r) => r.data),
  get: (id) => client.get(`/sales-orders/${id}`).then((r) => r.data),
  confirm: (id) => client.post(`/sales-orders/${id}/confirm`).then((r) => r.data),
  dispatch: (id, data) => client.post(`/sales-orders/${id}/dispatch`, data).then((r) => r.data),
  cancel: (id) => client.post(`/sales-orders/${id}/cancel`).then((r) => r.data),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard').then((r) => r.data),
};