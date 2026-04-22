/**
 * Sea Search — Shared Utility Functions
 * Always import from here. Never redefine inline.
 */

export const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

export const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return Number(n).toLocaleString();
};

export const fmtCurrency = (n, currency = 'SGD') =>
    `${currency} ${Number(n).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;

export const fmtDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtRelative = (ts) => {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export const stageColor = (stage) => ({
    sourced:   'var(--mist4)',
    screened:  'var(--amber2)',
    interview: 'var(--sea2)',
    offered:   'var(--violet2)',
    hired:     'var(--jade2)',
    rejected:  'var(--ruby2)',
}[stage] || 'var(--wire)');

export const INDUSTRY_COLORS = {
    'Finance & Banking': { bg: '#E8F2FB', text: '#0B4F8A', border: '#C5DFF5' },
    'Technology':        { bg: '#EEE9FB', text: '#2D1F6E', border: '#C4B8F0' },
    'Healthcare':        { bg: '#FBE8E8', text: '#7A1A1A', border: '#F7C1C1' },
    'FMCG':              { bg: '#FDF0E8', text: '#7A3B0A', border: '#F5C9A0' },
    'Consulting':        { bg: '#EEE9FB', text: '#2D1F6E', border: '#C4B8F0' },
    'Real Estate':       { bg: '#FDF8E1', text: '#6B4F00', border: '#E8D88A' },
    'Supply Chain':      { bg: '#EAF4EB', text: '#1A4D1E', border: '#B8DFB9' },
};
