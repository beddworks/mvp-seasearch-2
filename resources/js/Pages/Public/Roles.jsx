import { useState } from 'react'
import { router, Link, usePage } from '@inertiajs/react'
import { Head } from '@inertiajs/react'

// ─── constants ────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'all',          icon: '⊞',  label: 'All Jobs'     },
    { key: 'exclusive',    icon: '⭐', label: 'Exclusive'    },
    { key: 'remote',       icon: '🏠', label: 'Remote'       },
    { key: 'multi',        icon: '👥', label: 'Multi-hire'   },
    { key: 'high_reward',  icon: '💰', label: 'High Reward'  },
    { key: 'new',          icon: '⚡', label: 'New'          },
    { key: 'low_pipeline', icon: '📉', label: 'Low Pipeline' },
]

const CONTRACT = { full_time: 'Full-time', contract: 'Contract', part_time: 'Part-time', interim: 'Interim' }

const SENIORITY = {
    c_suite:     { label: 'C-Suite',       cls: 'badge badge-amber'  },
    vp_director: { label: 'VP / Director', cls: 'badge badge-violet' },
    manager:     { label: 'Manager',       cls: 'badge badge-sea'    },
    ic:          { label: 'IC',            cls: 'badge badge-sea'    },
}

const IND_LOGO = {
    Finance:    { bg: '#E8F2FB', color: '#0B4F8A', border: '#C5DFF5' },
    Technology: { bg: '#EEE9FB', color: '#2D1F6E', border: '#C4B8F0' },
    Healthcare: { bg: '#FBE8E8', color: '#7A1A1A', border: '#F7C1C1' },
    FMCG:       { bg: '#FDF0E8', color: '#7A3B0A', border: '#F5C49A' },
    Consulting: { bg: '#EEE9FB', color: '#2D1F6E', border: '#C4B8F0' },
    _default:   { bg: '#F2F0EC', color: '#6B6860', border: '#E0DDD6' },
}

const IND_BAR = {
    Finance: '#1A6DB5', Technology: '#4B3AA8', Healthcare: '#B52525',
    FMCG: '#4CAF52', Consulting: '#4B3AA8', _default: '#1A6DB5',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function coInitials(name) {
    return (name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function fmtPosted(iso) {
    if (!iso) return null
    const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000)
    if (days === 0) return 'Posted today'
    if (days === 1) return 'Posted 1d ago'
    if (days < 7)   return `Posted ${days}d ago`
    if (days < 14)  return 'Posted 1w ago'
    return `Posted ${Math.floor(days / 7)}w ago`
}

function fmtK(n) {
    if (n == null) return '?'
    const v = Math.round(Number(n))
    return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
         : v >= 1000      ? `${Math.round(v / 1000)}K`
         : String(v)
}

function calcReward(m) {
    if (m.reward_min && m.reward_max) return { min: Number(m.reward_min), max: Number(m.reward_max) }
    if (m.salary_min && m.salary_max && m.reward_pct) {
        const p = Number(m.reward_pct)
        return { min: Math.round(Number(m.salary_min) * p), max: Math.round(Number(m.salary_max) * p) }
    }
    return null
}

function isNew(iso) {
    return iso && (Date.now() - new Date(iso)) < 7 * 86_400_000
}

// ─── main page ─────────────────────────────────────────────────────────────────

export default function PublicRoles({ mandates, tab, q, co, sort, filters, totalActive, totalExclusive, myClaimIds, atCapacity }) {
    const { auth } = usePage().props
    const isRecruiter = auth?.user?.role === 'recruiter'
    const [search,  setSearch]  = useState(q  || '')
    const [company, setCompany] = useState(co || '')

    function nav(extra = {}) {
        router.get(
            route('public.roles'),
            { tab, q: search, co: company, sort, ...filters, ...extra },
            { preserveState: true, preserveScroll: true }
        )
    }

    return (
        <>
            <Head title="Sea Search — Job Listings" />

            {/* ── public nav ─── */}
            <nav style={{
                height: 52, background: 'var(--ink)', display: 'flex', alignItems: 'center',
                padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 50,
                borderBottom: '1px solid var(--ink2)',
            }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    Sea<span style={{ color: 'var(--sea3)' }}>Search</span>
                </div>
                <div style={{ width: 1, height: 18, background: 'var(--ink2)' }} />
                <a href={route('public.roles')} style={{
                    fontSize: 12, padding: '5px 10px', borderRadius: 6, color: '#fff',
                    background: 'var(--sea)', textDecoration: 'none',
                }}>
                    Job listings
                </a>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isRecruiter ? (
                        <>
                            <Link href={route('recruiter.mandates.index')} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, color: '#D4D0C8', textDecoration: 'none', fontFamily: 'var(--font)' }}>
                                My roles
                            </Link>
                            <Link href={route('recruiter.dashboard')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, background: 'var(--sea2)', color: '#fff', textDecoration: 'none', fontWeight: 500, fontFamily: 'var(--font)' }}>
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <Link href={route('login')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, background: 'var(--sea2)', color: '#fff', textDecoration: 'none', fontWeight: 500, fontFamily: 'var(--font)' }}>
                            Sign in
                        </Link>
                    )}
                </div>
            </nav>

            {/* ── page body ─── */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

                {/* page-head */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                            Job listings
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink4)', marginTop: 3 }}>
                            {totalActive ?? mandates.total} open mandates across Southeast Asia
                            {totalExclusive > 0 ? ` · ${totalExclusive} exclusive` : ''}
                        </div>
                    </div>
                </div>

                {/* ── top-tabs ── */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => nav({ tab: t.key })}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                padding: '8px 14px', minWidth: 76,
                                border: `1px solid ${tab === t.key ? 'var(--sea3)' : 'var(--wire)'}`,
                                borderRadius: 10, background: tab === t.key ? 'var(--sea-pale)' : '#fff',
                                cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font)',
                            }}>
                            <span style={{ fontSize: 15 }}>{t.icon}</span>
                            <span style={{ fontSize: 10, color: tab === t.key ? 'var(--sea)' : 'var(--ink4)', whiteSpace: 'nowrap' }}>
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── search-row ── */}
                <form onSubmit={e => { e.preventDefault(); nav({}) }}
                    style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--wire2)', borderRadius: 6, padding: '0 12px', background: '#fff', height: 36 }}>
                        <span style={{ fontSize: 13, color: 'var(--wire2)', flexShrink: 0 }}>⌕</span>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search job title, company, keyword…"
                            style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font)', width: '100%', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--wire2)', borderRadius: 6, padding: '0 12px', background: '#fff', height: 36 }}>
                        <span style={{ fontSize: 13, color: 'var(--wire2)', flexShrink: 0 }}>🏢</span>
                        <input value={company} onChange={e => setCompany(e.target.value)}
                            placeholder="Search by company…"
                            style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font)', width: '100%', outline: 'none' }} />
                    </div>
                    <button type="submit" style={{
                        padding: '0 16px', fontSize: 12, border: '1px solid var(--wire2)', borderRadius: 6,
                        background: '#fff', color: 'var(--ink4)', cursor: 'pointer', fontFamily: 'var(--font)', height: 36,
                    }}>
                        ⚙ More filters
                    </button>
                </form>

                {/* ── filter-row ── */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <FSel value={filters?.industry || ''}      onChange={v => nav({ industry: v })}>
                        <option value="">All industries</option>
                        {['Technology','Finance','Healthcare','FMCG','Consulting'].map(o => <option key={o} value={o}>{o}</option>)}
                    </FSel>
                    <FSel value={filters?.location || ''}      onChange={v => nav({ location: v })}>
                        <option value="">All locations</option>
                        {['Singapore','Malaysia','Indonesia','Thailand','Vietnam','Philippines','Remote'].map(o => <option key={o} value={o}>{o}</option>)}
                    </FSel>
                    <FSel value={filters?.contract_type || ''} onChange={v => nav({ contract_type: v })}>
                        <option value="">All types</option>
                        <option value="full_time">Full-time</option>
                        <option value="contract">Contract</option>
                        <option value="interim">Interim</option>
                    </FSel>
                    <FSel value={filters?.seniority || ''}     onChange={v => nav({ seniority: v })}>
                        <option value="">All seniority</option>
                        {Object.entries(SENIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </FSel>
                    <FSel value={filters?.openings || ''}      onChange={v => nav({ openings: v })}>
                        <option value="">Any openings</option>
                        <option value="1">1 opening</option>
                        <option value="2+">2+ openings</option>
                    </FSel>
                    <select value={sort} onChange={e => nav({ sort: e.target.value })}
                        style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--wire2)', borderRadius: 6, background: '#fff', color: 'var(--ink)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)', marginLeft: 'auto' }}>
                        <option value="featured">Featured first</option>
                        <option value="newest">Newest first</option>
                        <option value="highest_reward">Highest reward</option>
                        <option value="highest_salary">Highest salary</option>
                    </select>
                </div>

                {/* ── results-bar ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{mandates.total} roles found</div>
                </div>

                {/* ── job-list ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mandates.data.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 64, color: 'var(--ink4)', fontSize: 14 }}>
                            No mandates found.
                        </div>
                    )}
                    {mandates.data.map(m => <JobCard key={m.id} m={m} claimed={myClaimIds?.includes(m.id)} atCapacity={atCapacity} isRecruiter={isRecruiter} />)}
                </div>

                {/* ── pagination ── */}
                {mandates.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                        {mandates.links.map((link, i) => (
                            <button key={i} disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                style={{
                                    padding: '5px 10px', fontSize: 12,
                                    border: '1px solid var(--wire2)', borderRadius: 6,
                                    background: link.active ? 'var(--sea2)' : '#fff',
                                    color: link.active ? '#fff' : 'var(--ink)',
                                    cursor: link.url ? 'pointer' : 'default',
                                    fontFamily: 'var(--font)',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ── footer CTA ── */}
                {!isRecruiter && (
                <div style={{
                    marginTop: 48, padding: '32px 24px', background: '#fff',
                    borderRadius: 12, border: '1px solid var(--wire)', textAlign: 'center',
                }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                        Ready to pick a role?
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 20 }}>
                        Sign in as a recruiter to pick mandates, submit candidates, and earn placement fees.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <Link href={route('login')} style={{
                            padding: '9px 22px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                            background: 'var(--sea2)', color: '#fff', textDecoration: 'none',
                            fontFamily: 'var(--font)',
                        }}>
                            Sign in
                        </Link>
                        <a href="mailto:hello@seasearch.asia" style={{
                            padding: '9px 22px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                            border: '1px solid var(--wire2)', background: '#fff', color: 'var(--ink)',
                            textDecoration: 'none', fontFamily: 'var(--font)',
                        }}>
                            Contact us
                        </a>
                    </div>
                </div>
                )}
            </div>
        </>
    )
}

// ─── JobCard ─────────────────────────────────────────────────────────────────

function JobCard({ m, claimed, atCapacity, isRecruiter }) {
    const co       = m.client?.company_name || '—'
    const logo     = IND_LOGO[m.industry] || IND_LOGO._default
    const bar      = IND_BAR[m.industry]  || IND_BAR._default
    const reward   = calcReward(m)
    const sen      = SENIORITY[m.seniority]
    const pct      = m.reward_pct ? (Number(m.reward_pct) * 100).toFixed(1).replace(/\.0$/, '') : null
    const openings = m.openings_count || 1
    const totalMin = reward ? reward.min * openings : null
    const totalMax = reward ? reward.max * openings : null
    const posted   = fmtPosted(m.published_at)
    const newBadge = isNew(m.published_at)

    const tags = [
        ...(Array.isArray(m.must_haves) ? m.must_haves.slice(0, 4) : []),
        posted,
    ].filter(Boolean)

    return (
        <div style={{
            background: '#fff',
            border: `${m.is_featured ? '1.5px' : '1px'} solid ${m.is_featured ? 'var(--sea3)' : 'var(--wire)'}`,
            borderRadius: 10, padding: '16px 18px',
            position: 'relative', overflow: 'hidden',
            transition: 'border-color .15s',
        }}>
            {/* accent bar — featured only */}
            {m.is_featured && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bar }} />
            )}

            <div style={{ display: 'flex', gap: 12 }}>

                {/* logo */}
                <div style={{
                    width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 500,
                    background: logo.bg, color: logo.color, border: `1px solid ${logo.border}`,
                }}>
                    {coInitials(co)}
                </div>

                {/* body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 2 }}>{co}</div>

                    {/* title + badges */}
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF52', flexShrink: 0, display: 'inline-block' }} />
                        {m.title}
                        {m.is_featured  && <span className="badge badge-sea"  style={{ fontSize: 10 }}>Featured</span>}
                        {m.is_exclusive && <span className="badge badge-gold" style={{ fontSize: 10 }}>⭐ Exclusive</span>}
                        {newBadge       && <span className="badge badge-jade" style={{ fontSize: 10 }}>New</span>}
                    </div>

                    {/* meta chips */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                        {m.contract_type && <Chip>💼 {CONTRACT[m.contract_type] || m.contract_type}</Chip>}
                        {m.location      && <Chip>📍 {m.location}</Chip>}
                        {m.salary_min && m.salary_max && (
                            <Chip>💰 {m.salary_currency} {fmtK(m.salary_min)} – {fmtK(m.salary_max)}</Chip>
                        )}
                        <Chip>👥 {openings} opening{openings !== 1 ? 's' : ''}</Chip>
                        {sen && <span className={sen.cls} style={{ fontSize: 10 }}>{sen.label}</span>}
                        {m.industry && <span className="badge badge-sea" style={{ fontSize: 10 }}>{m.industry}</span>}
                    </div>

                    {/* description */}
                    {m.description && (
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65, marginBottom: 8 }}>
                            {m.description.length > 180 ? m.description.slice(0, 180) + '…' : m.description}
                        </div>
                    )}

                    {/* tags */}
                    {tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {tags.map((t, i) => (
                                <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* right panel */}
                <div style={{ minWidth: 190, textAlign: 'right', borderLeft: '1px solid var(--wire)', paddingLeft: 16, flexShrink: 0 }}>
                    {reward ? (
                        <>
                            <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Base hire reward</div>
                            <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 1 }}>
                                {m.salary_currency} {fmtK(reward.min)} – {fmtK(reward.max)}
                            </div>
                            {pct && (
                                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 8 }}>{pct}% of first year salary</div>
                            )}
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Reward</div>
                            <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8 }}>TBD</div>
                        </>
                    )}

                    <div style={{ height: 1, background: 'var(--wire)', margin: '6px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink4)', padding: '1px 0' }}>
                        <span>Roles</span><span>{openings}×</span>
                    </div>

                    <div style={{ height: 1, background: 'var(--wire)', margin: '6px 0' }} />

                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginTop: 6, marginBottom: 2 }}>Total base reward</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>
                        {totalMin ? `${m.salary_currency} ${fmtK(totalMin)}–${fmtK(totalMax)}+` : '—'}
                    </div>

                    {/* CTA — changes based on auth state */}
                    <div style={{ marginTop: 10 }}>
                        {isRecruiter ? (
                            claimed ? (
                                <Link href={route('recruiter.mandates.workspace', m.id)} style={{ display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--jade3)', borderRadius: 6, background: 'var(--jade-pale)', color: 'var(--jade2)', textAlign: 'center', textDecoration: 'none' }}>
                                    Open workspace →
                                </Link>
                            ) : atCapacity ? (
                                <button disabled style={{ width: '100%', padding: '6px 0', fontSize: 11, border: '1px solid var(--wire2)', borderRadius: 6, background: 'var(--mist2)', color: 'var(--ink4)', cursor: 'not-allowed', fontFamily: 'var(--font)' }}>
                                    At capacity
                                </button>
                            ) : (
                                <Link href={route('recruiter.mandates.pick', m.id)} style={{ display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--sea3)', borderRadius: 6, background: 'transparent', color: 'var(--sea)', textAlign: 'center', textDecoration: 'none' }}>
                                    Pick this role →
                                </Link>
                            )
                        ) : (
                            <Link href={route('login')} style={{ display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--sea3)', borderRadius: 6, background: 'transparent', color: 'var(--sea)', textAlign: 'center', textDecoration: 'none' }}>
                                Sign in to pick →
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── tiny sub-components ──────────────────────────────────────────────────────

function FSel({ value, onChange, children }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--wire2)', borderRadius: 6, background: '#fff', color: 'var(--ink)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
            {children}
        </select>
    )
}

function Chip({ children }) {
    return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>
            {children}
        </span>
    )
}
