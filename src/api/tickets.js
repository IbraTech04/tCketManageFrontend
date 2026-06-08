import { api } from './client';

export const ticketsApi = {
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),

  // Resend the ticket email to a single attendee.
  // Returns TicketResponse with a refreshed lastTicketSent.
  resend: (id) => api.post(`/tickets/${id}/resend`),
};
