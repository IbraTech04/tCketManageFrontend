import Badge from './ui/Badge';

const TYPE_COLORS = {
  GA:         { c: 'var(--text-2)',   bg: 'var(--surface-3)' },
  VIP:        { c: 'var(--purple)',   bg: 'var(--purple-soft)' },
  Backstage:  { c: 'var(--blue)',     bg: 'var(--blue-soft)' },
  Crew:       { c: 'var(--orange)',   bg: 'var(--orange-soft)' },
  Afterparty: { c: 'var(--pink)',     bg: 'var(--pink-soft)' },
};

function colorForName(name = '') {
  const n = name.toLowerCase();
  if (n.includes('vip'))        return TYPE_COLORS.VIP;
  if (n.includes('backstage'))  return TYPE_COLORS.Backstage;
  if (n.includes('crew') || n.includes('artist')) return TYPE_COLORS.Crew;
  if (n.includes('after') || n.includes('party')) return TYPE_COLORS.Afterparty;
  return TYPE_COLORS.GA;
}

export default function TypePill({ ticketType }) {
  if (!ticketType) return null;
  const { c, bg } = colorForName(ticketType.name);
  return <Badge color={c} bg={bg}>{ticketType.name}</Badge>;
}
