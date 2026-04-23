import AdminLayout from '@/Layouts/AdminLayout'
import { fmtCurrency } from '@/lib/utils'

export default function Dashboard({ stats }) {
    const cards = [
        { label: 'Total recruiters',  value: stats.total_recruiters,  color: 'var(--sea2)' },
        { label: 'Active mandates',   value: stats.active_mandates,   color: 'var(--jade2)' },
        { label: 'Pending claims',    value: stats.pending_claims,    color: 'var(--amber2)' },
        { label: 'Total placements',  value: stats.total_placements,  color: 'var(--violet2)' },
    ]

    return (
        <AdminLayout breadcrumb="Dashboard">
            {/* Hero */}
            <div style={{
                background: 'var(--ink)', borderRadius: 'var(--r)', border: '1px solid var(--ink2)',
                padding: '20px 24px', marginBottom: 16,
            }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#888780', marginBottom: 4 }}>
                    Platform revenue YTD
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-head)', letterSpacing: '-.02em' }}>
                    {fmtCurrency(stats.revenue_ytd, 'SGD')}
                </div>
            </div>

            {/* Stats */}
            <div className="stat-row" style={{ marginBottom: 20 }}>
                {cards.map((c, i) => (
                    <div key={i} className="sm">
                        <div className="sm-bar" style={{ background: c.color }} />
                        <div className="sm-num">{c.value}</div>
                        <div className="sm-lbl">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Nav Grid */}
            <div className="g3">
                {[
                    { icon: '📋', title: 'Mandates',          sub: 'Create, edit, assign roles',      href: route('admin.mandates.index') },
                    { icon: '🏢', title: 'Clients',           sub: 'Client accounts + GSheet',        href: route('admin.clients.index') },
                    { icon: '◉', title: 'Recruiters',        sub: 'Manage tier, trust level',        href: route('admin.recruiters.index') },
                    { icon: '⚙', title: 'Compensation types',sub: '4 fee formulas',                  href: route('admin.compensation-types.index') },
                    { icon: '🔀', title: 'Exception rules',   sub: 'Bypass admin gate',              href: route('admin.exception-rules.index') },
                    { icon: '📊', title: 'Analytics',         sub: 'Revenue, placement data',         href: route('admin.analytics.index') },
                ].map(item => (
                    <a key={item.title} href={item.href} style={{
                        background: 'var(--mist)', border: '1px solid var(--wire)', borderRadius: 'var(--r)',
                        padding: '18px 20px', textDecoration: 'none', display: 'block',
                        transition: 'all .15s',
                    }}>
                        <span style={{ fontSize: 22, display: 'block', marginBottom: 10 }}>{item.icon}</span>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{item.sub}</div>
                    </a>
                ))}
            </div>
        </AdminLayout>
    )
}
