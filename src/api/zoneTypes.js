import { api } from './client';

export const zoneTypesApi = {
  updateZone: (id, data) => api.put(`/zones/${id}`, data),
  deleteZone: (id) => api.delete(`/zones/${id}`),
  updateTicketType: (id, data) => api.put(`/ticket-types/${id}`, data),
  deleteTicketType: (id) => api.delete(`/ticket-types/${id}`),
};

const ZONE_COLORS = ['#FF6A1A', '#7c5cff', '#0ea5e9', '#ec4899', '#16a34a', '#d97706', '#14b8a6', '#f43f5e'];

export function zoneColor(idOrIndex) {
  if (typeof idOrIndex === 'number') return ZONE_COLORS[idOrIndex % ZONE_COLORS.length];
  let h = 0;
  for (const c of String(idOrIndex)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ZONE_COLORS[h % ZONE_COLORS.length];
}

export function entitlementMap(ticketType) {
  const map = {};
  for (const e of ticketType.entitlements || []) {
    map[e.zoneId] = e.maxEntries ?? null;
  }
  return map;
}

export function money(n, currency = 'CAD') {
  return '$' + Number(n).toFixed(2);
}
