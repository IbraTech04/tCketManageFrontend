import { api } from './client';

export const ordersApi = {
  list: (eventId) => api.get(`/orders?eventId=${eventId}`),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  // Confirm a manual payment. `providerRef` is optional — for Interac it's the
  // reference number printed on the e-Transfer notification, recorded against the
  // order in the same call. Omit it and the order still settles, just without one.
  confirmPayment: (id, providerRef) =>
    api.post(`/orders/${id}/confirm-manual-payment`, providerRef ? { providerRef } : {}),
  cancel: (id) => api.post(`/orders/${id}/cancel`, {}),

  // Bookkeeping: attach or correct the provider-side reference without touching
  // status, for the e-Transfer that never got matched automatically (buyer mistyped
  // the memo code, left it out, or the mailbox listener was down). Safe on a paid
  // order — it records the reference and does not re-issue tickets.
  updatePaymentReference: (id, providerRef) =>
    api.put(`/orders/${id}/payment-reference`, { providerRef }),

  // ── Quarantine review ──
  // Approve a held order: clears quarantine and issues tickets.
  //
  // Deliberately its own endpoint rather than confirm-manual-payment, and behind a
  // stricter admin role: approving a quarantine means overriding the check that held
  // the order (usually a mismatched amount), so it must not be reachable from the
  // routine confirm button.
  //
  // `providerRef` is optional. A quarantined e-Transfer is usually one the listener
  // could not tie to the order, so its reference was never captured automatically —
  // the operator approving the review is the one person holding it.
  approveQuarantine: (id, providerRef) =>
    api.post(`/orders/${id}/quarantine/approve`, providerRef ? { providerRef } : {}),
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
