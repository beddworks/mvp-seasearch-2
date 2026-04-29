import { router, usePage, Link } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'

// ─── constants ────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'all',      label: 'All' },
    { key: 'approved', label: 'Active' },
    { key: 'pending',  label: 'Pending approval' },
    { key: 'rejected', label: 'Rejected' },
]

const CLAIM_STATUS = {
    approved: { label: 'Active',           cls: 'badge badge-jade'   },
    pending:  { label: 'Pending approval', cls: 'badge badge-amber'  },
    rejected: { label: 'Rejected',         cls: 'badge badge-ruby'   },
}

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
    return v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)
}

function calcReward(m) {
    const ct = m.compensation_type || m.client?.compensation_type
    const cur = m.salary_currency || 'SGD'

    if (ct) {
        const ff = ct.formula_fields || {}
        switch (ct.formula_type) {
            case 'percentage': {
                const pct = Number(ct.platform_fee_pct)
                if (m.salary_min && m.salary_max) {
                    const pctDisplay = (pct * 100).toFixed(1).replace(/\.0$/, '')
                    return { min: Math.round(Number(m.salary_min) * pct), max: Math.round(Number(m.salary_max) * pct), type: 'percentage', subLabel: `${pctDisplay}% of first year salary`, currency: cur }
                }
                return null
            }
            case 'hourly': {
                const rate = Number(ff.hourly_rate || 0), hours = Number(ff.hours_billed || 0)
                return { min: Math.round(rate * hours), max: Math.round(rate * hours), type: 'hourly', subLabel: `${cur} ${rate}/hr × ${hours}h`, currency: cur }
            }
            case 'fixed': {
                const amt = Number(ff.fixed_amount || 0)
                return { min: amt, max: amt, type: 'fixed', subLabel: 'Fixed rate', currency: cur }
            }
            case 'milestone': {
                const mss = Array.isArray(ff.milestones) ? ff.milestones : []
                const total = mss.reduce((s, ms) => s + Number(ms.amount || 0), 0)
                return { min: total, max: total, type: 'milestone', subLabel: `${mss.length} milestone${mss.length !== 1 ? 's' : ''}`, currency: cur }
            }
        }
    }

    if (m.reward_min && m.reward_max) return { min: Number(m.reward_min), max: Number(m.reward_max), type: 'legacy', subLabel: null, currency: cur }
    if (m.salary_min && m.salary_max && m.reward_pct) {
        const p = Number(m.reward_pct)
        return { min: Math.round(Number(m.salary_min) * p), max: Math.round(Number(m.salary_max) * p), type: 'percentage', subLabel: `${(p * 100).toFixed(1).replace(/\.0$/, '')}% of first year salary`, currency: cur }
    }
    return null
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MandatesIndex({ claims, tab, atCapacity }) {
    const { flash } = usePage().props

    return (
        <RecruiterLayout>
            <div style={{ padding: 24 }}>

              

                {/* header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                            My roles
                        </div>
                       
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Link href={route('public.roles')} className="btn btn-primary btn-sm">
                            Browse all roles →
                        </Link>
                    </div>
                </div>

                {/* tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--wire)', paddingBottom: 0 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => router.get(route('recruiter.mandates.index'), { tab: t.key }, { preserveState: true })}
                            style={{
                                padding: '7px 14px', fontSize: 12, border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--sea2)' : 'transparent'}`,
                                background: 'transparent', color: tab === t.key ? 'var(--sea2)' : 'var(--ink4)',
                                cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: tab === t.key ? 500 : 400,
                                marginBottom: -1,
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* claim cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {claims.data.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 64, color: 'var(--ink4)', fontSize: 14 }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                            <div style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>No roles yet</div>
                            <div style={{ marginBottom: 20 }}>You haven't picked any roles. Browse the job listings to get started.</div>
                            <Link href={route('public.roles')} className="btn btn-primary btn-sm">Browse roles</Link>
                        </div>
                    )}
                    {claims.data.map(claim => (
                        <ClaimCard key={claim.id} claim={claim} />
                    ))}
                </div>

                {/* pagination */}
                {claims.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                        {claims.links.map((link, i) => (
                            <button key={i} disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                style={{
                                    padding: '5px 10px', fontSize: 12, border: '1px solid var(--wire2)',
                                    borderRadius: 6, background: link.active ? 'var(--sea2)' : '#fff',
                                    color: link.active ? '#fff' : 'var(--ink)', cursor: link.url ? 'pointer' : 'default',
                                    fontFamily: 'var(--font)',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </RecruiterLayout>
    )
}

// ─── ClaimCard ────────────────────────────────────────────────────────────────

function ClaimCard({ claim }) {
    const m        = claim.mandate
    if (!m) return null
    const co       = m.client?.company_name || '—'
    const logo     = IND_LOGO[m.industry] || IND_LOGO._default
    const bar      = IND_BAR[m.industry]  || IND_BAR._default
    const reward   = calcReward(m)
    const sen      = SENIORITY[m.seniority]
    const openings = m.openings_count || 1
    const scalable  = reward && (reward.type === 'percentage' || reward.type === 'legacy')
    const totalMin  = scalable ? reward.min * openings : (reward ? reward.min : null)
    const totalMax  = scalable ? reward.max * openings : (reward ? reward.max : null)
    const isSingleValue = reward && reward.min === reward.max
    const posted   = fmtPosted(m.published_at)
    const status   = CLAIM_STATUS[claim.status] || CLAIM_STATUS.pending

    const tags = [
        ...(Array.isArray(m.must_haves) ? m.must_haves.slice(0, 3) : []),
        posted,
    ].filter(Boolean)

    return (
        <div style={{
            background: '#fff',
            border: `1px solid ${claim.status === 'approved' ? 'var(--jade-soft)' : claim.status === 'rejected' ? '#F7C1C1' : 'var(--wire)'}`,
            borderRadius: 10, padding: '16px 18px',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bar }} />

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

                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF52', flexShrink: 0, display: 'inline-block' }} />
                        {m.title}
                        <span className={status.cls} style={{ fontSize: 10 }}>{status.label}</span>
                        {m.is_featured  && <span className="badge badge-sea"  style={{ fontSize: 10 }}>Featured</span>}
                        {m.is_exclusive && <span className="badge badge-gold" style={{ fontSize: 10 }}>⭐ Exclusive</span>}
                    </div>

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

                    {m.description && (
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65, marginBottom: 8 }}>
                            {m.description.length > 180 ? m.description.slice(0, 180) + '…' : m.description}
                        </div>
                    )}

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
                                {isSingleValue
                                    ? `${reward.currency} ${fmtK(reward.min)}`
                                    : `${reward.currency} ${fmtK(reward.min)} – ${fmtK(reward.max)}`
                                }
                            </div>
                            {reward.subLabel && <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 8 }}>{reward.subLabel}</div>}
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
                        {totalMin
                            ? (totalMin === totalMax
                                ? `${reward.currency} ${fmtK(totalMin)}+`
                                : `${reward.currency} ${fmtK(totalMin)}–${fmtK(totalMax)}+`)
                            : '—'
                        }
                    </div>

                    <div style={{ marginTop: 10 }}>
                        {claim.status === 'approved' ? (
                            <Link href={route('recruiter.mandates.workspace', m.id)} style={{
                                display: 'block', width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500,
                                border: '1px solid var(--jade3)', borderRadius: 6,
                                background: 'var(--jade-pale)', color: 'var(--jade2)',
                                textAlign: 'center', textDecoration: 'none',
                            }}>
                                Open workspace →
                            </Link>
                        ) : claim.status === 'rejected' ? (
                            <div style={{ fontSize: 11, color: 'var(--ruby2)', padding: '6px 0', textAlign: 'center' }}>
                                Claim rejected
                            </div>
                        ) : (
                            <div style={{ fontSize: 11, color: 'var(--amber2)', padding: '6px 0', textAlign: 'center' }}>
                                ⏳ Awaiting admin approval
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── tiny sub-components ──────────────────────────────────────────────────────

function Flash({ color, children }) {
    const map = {
        jade: { bg: 'var(--jade-pale)', border: 'var(--jade-soft)', text: 'var(--jade2)' },
        ruby: { bg: 'var(--ruby-pale)', border: '#F7C1C1',          text: 'var(--ruby2)' },
    }
    const c = map[color] || map.jade
    return (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: c.text }}>
            {children}
        </div>
    )
}

function Chip({ children }) {
    return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>
            {children}
        </span>
    )
}
