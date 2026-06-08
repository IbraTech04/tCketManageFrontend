import { api } from './client';

export const ordersApi = {
  list: (eventId) => api.get(`/orders?eventId=${eventId}`),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  confirmPayment: (id) => api.post(`/orders/${id}/confirm-manual-payment`, {}),
  cancel: (id) => api.post(`/orders/${id}/cancel`, {}),
};
