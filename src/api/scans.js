import { api } from './client';

// outcome enum: SUCCESS | INVALID_QR | NO_ZONE_ENTITLEMENT | ENTRY_LIMIT_REACHED
export const scansApi = {
  scan: (ticketId, zoneId) =>
    api.post('/scans/scan', { ticketId, zoneId }),

  scanQr: (qrPayload, zoneId) =>
    api.post('/scans/scan-qr', { qrPayload, zoneId }),

  validate: (ticketId, zoneId) =>
    api.post('/scans/validate', { ticketId, zoneId }),

  forEvent: (eventId, page = 0, size = 50) =>
    api.get(`/scans/event/${eventId}?page=${page}&size=${size}`),

  forZone: (zoneId, page = 0, size = 50) =>
    api.get(`/scans/zone/${zoneId}?page=${page}&size=${size}`),

  forTicket: (ticketId) =>
    api.get(`/scans/ticket/${ticketId}`),

  entryCount: (ticketId, zoneId) =>
    api.get(`/scans/count/ticket/${ticketId}/zone/${zoneId}`),
};

export function outcomeToDisplay(outcome) {
  switch (outcome) {
    case 'SUCCESS':             return { label: 'Allowed',      color: '#22c55e', variant: 'ALLOWED' };
    case 'ENTRY_LIMIT_REACHED': return { label: 'Limit reached', color: '#f59e0b', variant: 'LIMIT' };
    case 'INVALID_QR':          return { label: 'Invalid QR',   color: '#f43f5e', variant: 'DENIED' };
    case 'NO_ZONE_ENTITLEMENT': return { label: 'Access denied', color: '#f43f5e', variant: 'DENIED' };
    default:                    return { label: outcome,         color: '#f43f5e', variant: 'DENIED' };
  }
}
