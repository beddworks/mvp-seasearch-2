import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'

const TABS = [
    { key: 'all',      icon: '⊞', label: 'All Jobs' },
    { key: 'featured', icon: '⭐', label: 'Featured' },
    { key: 'exclusive',icon: '🏅', label: 'Exclusive' },
    { key: 'remote',   icon: '🏠', label: 'Remote' },
    { key: 'multi',    icon: '👥', label: 'Multi-hire' },
]

const SENIORITY_LABELS = { c_suite: 'C-Suite', vp_director: 'VP / Director', manager: 'Manager', ic: 'IC' }

function seniorityBadgeColor(s) {
    if (s === 'c_suite') return 'var(--amber2)'
    if (s === 'vp_director') return 'var(--violet2)'
    if (s === 'manager') return 'var(--sea2)'
    return 'var(--ink4)'
}

export default function MandatesIndex({ mandates, myClaimIds, tab, q, filters, atCapacity }) {
    const { flash } = usePage().props
    const [search, setSearch] = useState(q || '')

    function applyTab(t) {
        router.get(route('recruiter.mandates.index'), { tab: t, q: search, ...filters }, { preserveState: true })
    }

    function applySearch(e) {
        e.preventDefault()
        router.get(route('recruiter.mandates.index'), { tab, q: search, ...filters }, { preserveState: true })
    }

    function applyFilter(key, val) {
        router.get(route('recruiter.mandates.index'), { tab, q: search, ...filters, [key]: val }, { preserveState: true })
    }

    return (
        <RecruiterLayout>
            <div className="page-content">
                {/* Flash */}
                {flash?.success && (
                    <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--jade2)' }}>
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div style={{ background: 'var(--ruby-pale, #fbe8e8)', border: '1px solid var(--ruby2)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--ruby2)' }}>
                        {flash.error}
                    </div>
                )}

                {/* Header */}
                <div className="page-head">
                    <div>
                        <div className="page-title">Job listings</div>
                        <div className="page-sub">{mandates.total} open mandates · pick up to 2 roles</div>
                    </div>
                    {atCapacity && (
                        <span className="badge badge-amber" style={{ fontSize: 12 }}>At capacity (2/2)</span>
                    )}
                </div>

                {/* Tab filters */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => applyTab(t.key)} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '8px 14px', border: `1px solid ${tab === t.key ? 'var(--sea3)' : 'var(--wire)'}`,
                            borderRadius: 10, cursor: 'pointer', background: tab === t.key ? 'var(--sea-pale)' : '#fff',
                            minWidth: 76,
                        }}>
                            <span style={{ fontSize: 15 }}>{t.icon}</span>
                            <span style={{ fontSize: 10, color: tab === t.key ? 'var(--sea2)' : 'var(--ink4)', whiteSpace: 'nowrap' }}>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Search + filters */}
                <form onSubmit={applySearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--wire2)', borderRadius: 6, padding: '0 12px', background: '#fff', height: 36 }}>
                        <span style={{ color: 'var(--wire2)' }}>⌕</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, company, keyword…" style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font)', width: '100%', outline: 'none' }} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                </form>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <select className="form-input" style={{ padding: '5px 10px', fontSize: 12, maxWidth: 160 }} value={filters?.industry || ''} onChange={e => applyFilter('industry', e.target.value)}>
                        <option value="">All industries</option>
                        {['Technology','Finance','Healthcare','FMCG','Consulting'].map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <select className="form-input" style={{ padding: '5px 10px', fontSize: 12, maxWidth: 160 }} value={filters?.seniority || ''} onChange={e => applyFilter('seniority', e.target.value)}>
                        <option value="">All seniority</option>
                        {Object.entries(SENIORITY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 12 }}>{mandates.total} roles found</div>

                {/* Job cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mandates.data.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink4)', fontSize: 14 }}>No mandates found.</div>
                    )}
                    {mandates.data.map(m => {
                        const claimed = myClaimIds.includes(m.id)
                        const co = m.client?.company_name || '—'
                        const initials2 = co.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                        return (
                            <div key={m.id} style={{
                                background: '#fff', border: `${m.is_featured ? '1.5px' : '1px'} solid ${m.is_featured ? 'var(--sea3)' : 'var(--wire)'}`,
                                borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden',
                            }}>
                                {m.is_featured && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--sea2)' }} />}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {/* Logo */}
                                    <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, border: '1px solid var(--wire)' }}>
                                        {initials2}
                                    </div>

                                    {/* Body */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 2 }}>{co}</div>
                                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jade3)', flexShrink: 0, display: 'inline-block' }} />
                                            {m.title}
                                            {m.is_featured && <span className="badge badge-sea" style={{ fontSize: 10 }}>Featured</span>}
                                            {m.is_exclusive && <span className="badge badge-gold" style={{ fontSize: 10 }}>⭐ Exclusive</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {m.location && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>📍 {m.location}</span>}
                                            {m.salary_min && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>💰 {m.salary_currency} {Number(m.salary_min).toLocaleString()}–{Number(m.salary_max).toLocaleString()}</span>}
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>👥 {m.openings_count} opening{m.openings_count > 1 ? 's' : ''}</span>
                                            {m.seniority && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: seniorityBadgeColor(m.seniority), fontWeight: 500 }}>{SENIORITY_LABELS[m.seniority]}</span>}
                                            {m.industry && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--sea-pale)', color: 'var(--sea2)', fontWeight: 500 }}>{m.industry}</span>}
                                        </div>
                                        {m.description && <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65, marginBottom: 8 }}>{m.description.substring(0, 180)}{m.description.length > 180 ? '…' : ''}</div>}
                                    </div>

                                    {/* Right: reward + pick */}
                                    <div style={{ minWidth: 180, textAlign: 'right', borderLeft: '1px solid var(--wire)', paddingLeft: 16, flexShrink: 0 }}>
                                        {m.reward_pct && (
                                            <>
                                                <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Base hire reward</div>
                                                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 1 }}>
                                                    {m.salary_min ? `${m.salary_currency} ${Math.round(m.salary_min * m.reward_pct).toLocaleString()}–${Math.round(m.salary_max * m.reward_pct).toLocaleString()}` : '—'}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 8 }}>{Math.round(m.reward_pct * 100)}% of first year salary</div>
                                            </>
                                        )}
                                        <div style={{ height: 1, background: 'var(--wire)', margin: '6px 0' }} />
                                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 2 }}>Openings</div>
                                        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)', marginBottom: 10 }}>{m.openings_count}×</div>

                                        {claimed ? (
                                            <a href={route('recruiter.mandates.workspace', m.id)} style={{ display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--jade3)', borderRadius: 6, background: 'var(--jade-pale)', color: 'var(--jade2)', textAlign: 'center', textDecoration: 'none' }}>
                                                Open workspace →
                                            </a>
                                        ) : atCapacity ? (
                                            <button disabled style={{ width: '100%', padding: '6px 0', fontSize: 11, border: '1px solid var(--wire2)', borderRadius: 6, background: 'var(--mist2)', color: 'var(--ink4)', cursor: 'not-allowed', fontFamily: 'var(--font)' }}>
                                                At capacity
                                            </button>
                                        ) : (
                                            <a href={route('recruiter.mandates.pick', m.id)} style={{ display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--sea3)', borderRadius: 6, background: 'transparent', color: 'var(--sea2)', textAlign: 'center', textDecoration: 'none' }}>
                                                Pick this role →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Pagination */}
                {mandates.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                        {mandates.links.map((link, i) => (
                            <button key={i} disabled={!link.url} onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--wire2)', borderRadius: 6, background: link.active ? 'var(--sea2)' : '#fff', color: link.active ? '#fff' : 'var(--ink)', cursor: link.url ? 'pointer' : 'default', fontFamily: 'var(--font)' }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </RecruiterLayout>
    )
}
