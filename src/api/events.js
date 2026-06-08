import { api } from './client';

export const eventsApi = {
  list: (page = 0, size = 50) =>
    api.get(`/events?page=${page}&size=${size}`),

  get: (id) => api.get(`/events/${id}`),

  create: (data) => api.post('/events', data),

  // Atomic event creation wizard: event + zones + ticket types + entitlements
  // in a single request. Returns FullEventResponse { event, ticketTypes }.
  createFull: (data) => api.post('/events/full', data),

  update: (id, data) => api.put(`/events/${id}`, data),

  delete: (id) => api.delete(`/events/${id}`),

  getZones: (id) => api.get(`/events/${id}/zones`),

  addZone: (id, zoneName) => api.post(`/events/${id}/zones`, { zoneName }),

  getTicketTypes: (id) => api.get(`/events/${id}/ticket-types`),

  createTicketType: (id, data) => api.post(`/events/${id}/ticket-types`, data),

  getTickets: (id, page = 0, size = 50) =>
    api.get(`/events/${id}/tickets?page=${page}&size=${size}`),

  // Bulk ticket delivery. Both return TicketDeliveryResponse { total, sent, failed }.
  // resendTickets: (re)sends to every attendee in the event.
  // sendMissingTickets: sends only to attendees who never received their ticket.
  resendTickets: (id) => api.post(`/events/${id}/tickets/resend`),
  sendMissingTickets: (id) => api.post(`/events/${id}/tickets/send-missing`),

  importAttendees: (id, file, config) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'config',
      new Blob([JSON.stringify(config)], { type: 'application/json' })
    );
    return api.postForm(`/events/${id}/imports`, formData);
  },
};
