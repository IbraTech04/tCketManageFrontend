// Mirrors the backend OrderStatus enum. Keep this in sync with the API.
//   public enum OrderStatus {
//     AWAITING_PAYMENT, PAID, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED, QUARANTINED
//   }
export const ORDER_STATUS = {
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  QUARANTINED: 'QUARANTINED',
};

// Display metadata: label + badge colour tokens (from index.css).
export const ORDER_STATUS_META = {
  AWAITING_PAYMENT: { label: 'Awaiting payment', c: 'var(--amber)',  bg: 'var(--amber-soft)'  },
  PAID:             { label: 'Paid',             c: 'var(--green)',  bg: 'var(--green-soft)'  },
  QUARANTINED:      { label: 'Quarantined',      c: 'var(--purple)', bg: 'var(--purple-soft)' },
  REFUND_PENDING:   { label: 'Refund pending',   c: 'var(--amber)',  bg: 'var(--amber-soft)'  },
  REFUNDED:         { label: 'Refunded',         c: 'var(--text-2)', bg: 'var(--surface-3)'   },
  CANCELLED:        { label: 'Cancelled',        c: 'var(--red)',    bg: 'var(--red-soft)'    },
  EXPIRED:          { label: 'Expired',          c: 'var(--text-3)', bg: 'var(--surface-3)'   },
};

export function orderStatusMeta(status) {
  return ORDER_STATUS_META[status] || { label: status, c: 'var(--text-2)', bg: 'var(--surface-3)' };
}

export function orderStatusLabel(status) {
  return orderStatusMeta(status).label;
}

// Tab order for the Orders queue. Quarantined sits up front as a review queue.
export const ORDER_STATUS_TABS = [
  ORDER_STATUS.AWAITING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.QUARANTINED,
  ORDER_STATUS.REFUND_PENDING,
  ORDER_STATUS.REFUNDED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.EXPIRED,
];
