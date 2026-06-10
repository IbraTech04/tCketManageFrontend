import { api } from './client';

export const ticketsApi = {
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),

  // Kick off async resend for a single attendee.
  // Returns EmailJobAccepted { jobId, total }. Track via STOMP: /topic/email-jobs/{jobId}
  resend: (id) => api.post(`/tickets/${id}/resend`),
};
