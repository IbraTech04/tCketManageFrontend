import { api } from './client';

export const ordersApi = {
  list: (eventId) => api.get(`/orders?eventId=${eventId}`),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  confirmPayment: (id) => api.post(`/orders/${id}/confirm-manual-payment`, {}),
  cancel: (id) => api.post(`/orders/${id}/cancel`, {}),

  // ── Quarantine review ──
  // Approve a held order: clears quarantine and issues tickets.
  approveQuarantine: (id) => api.post(`/orders/${id}/quarantine/approve`, {}),
  // Deny a held order. `fundsReceived` tells the backend whether money actually
  // arrived — when true the order is routed to refund, otherwise it's voided.
  denyQuarantine: (id, fundsReceived) =>
    api.post(`/orders/${id}/quarantine/deny`, { fundsReceived }),

  // ── Refunds ──
  // Begin a refund for a paid order (→ REFUND_PENDING).
  refund: (id) => api.post(`/orders/${id}/refund`, {}),
  // Mark an external refund as settled (REFUND_PENDING → REFUNDED).
  completeRefund: (id) => api.post(`/orders/${id}/refund/complete`, {}),
};
