import { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { Head } from '@inertiajs/react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CONTRACT  = { full_time: 'Full-time', contract: 'Contract', part_time: 'Part-time', interim: 'Interim' }
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

const MANDATE_STATUS_DOT = {
    active:  'var(--jade3)',
    paused:  'var(--amber2)',
    closed:  'var(--ruby2)',
    filled:  'var(--sea2)',
    dropped: 'var(--ruby2)',
    draft:   'var(--ink4)',
}

function coInitials(name) {
    return (name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}
function fmtK(n) {
    if (n == null) return '?'
    const v = Math.round(Number(n))
    return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
         : v >= 1000      ? `${Math.round(v / 1000)}K`
         : String(v)
}

function calcReward(m) {
    const ct  = m.compensation_type || m.client?.compensation_type
    const cur = m.salary_currency || 'SGD'
    if (ct) {
        const ff = ct.formula_fields || {}
        switch (ct.formula_type) {
            case 'percentage': {
                const pct = Number(ct.platform_fee_pct)
                if (m.salary_min && m.salary_max) {
                    const pctDisplay = (pct * 100).toFixed(1).replace(/\.0$/, '')
                    return { min: Math.round(Number(m.salary_min) * pct), max: Math.round(Number(m.salary_max) * pct), subLabel: `${pctDisplay}% of first year salary`, currency: cur }
                }
                return null
            }
            case 'hourly': {
                const amt = Math.round(Number(ff.hourly_rate || 0) * Number(ff.hours_billed || 0))
                return { min: amt, max: amt, subLabel: `${cur} ${ff.hourly_rate}/hr × ${ff.hours_billed}h`, currency: cur }
            }
            case 'fixed': {
                const amt = Number(ff.fixed_amount || 0)
                return { min: amt, max: amt, subLabel: 'Fixed rate', currency: cur }
            }
            case 'milestone': {
                const total = (Array.isArray(ff.milestones) ? ff.milestones : []).reduce((s, ms) => s + Number(ms.amount || 0), 0)
                return { min: total, max: total, subLabel: `${(ff.milestones || []).length} milestone(s)`, currency: cur }
            }
        }
    }
    if (m.reward_min && m.reward_max) return { min: Number(m.reward_min), max: Number(m.reward_max), subLabel: null, currency: cur }
    if (m.salary_min && m.salary_max && m.reward_pct) {
        const p = Number(m.reward_pct)
        return { min: Math.round(Number(m.salary_min) * p), max: Math.round(Number(m.salary_max) * p), subLabel: `${(p * 100).toFixed(1).replace(/\.0$/, '')}% of first year salary`, currency: cur }
    }
    return null
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function RoleDetail({ mandate: m, claimStatus, atCapacity }) {
    const { auth }     = usePage().props
    const isRecruiter  = auth?.user?.role === 'recruiter'
    const co           = m.client?.company_name || '—'
    const logo         = IND_LOGO[m.industry] || IND_LOGO._default
    const bar          = IND_BAR[m.industry]  || IND_BAR._default
    const sen          = SENIORITY[m.seniority]
    const reward       = calcReward(m)
    const openings     = m.openings_count || 1
    const isSingle     = reward && reward.min === reward.max
    const scalable     = reward && (m.reward_pct || (m.compensation_type?.formula_type === 'percentage') || (m.client?.compensation_type?.formula_type === 'percentage'))
    const totalMin     = scalable ? reward.min * openings : (reward ? reward.min : null)
    const totalMax     = scalable ? reward.max * openings : (reward ? reward.max : null)

    const dotColor          = MANDATE_STATUS_DOT[m.status] || 'var(--ink4)'
    const hasIdealCandidates = (m.ideal_candidates || []).filter(ic => ic?.name).length > 0
    const hasIdeaCompanies   = (m.ideal_source_companies || []).length > 0
    const hasFlags           = (m.green_flags || []).length > 0 || (m.red_flags || []).length > 0
    const hasRequirements    = (m.must_haves || []).length > 0 || (m.nice_to_haves || []).length > 0
    const hasQA              = (m.screening_questions || []).length > 0

    return (
        <>
            <Head title={`${m.title} — Sea Search`} />

            {/* ── nav ── */}
            <nav style={{
                height: 52, background: 'var(--ink)', display: 'flex', alignItems: 'center',
                padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 50,
                borderBottom: '1px solid var(--ink2)',
            }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    Sea<span style={{ color: 'var(--sea3)' }}>Search</span>
                </div>
                <div style={{ width: 1, height: 18, background: 'var(--ink2)' }} />
                <Link href={route('public.roles')} style={{
                    fontSize: 12, padding: '5px 10px', borderRadius: 6, color: '#D4D0C8', textDecoration: 'none',
                }}>
                    ← Job listings
                </Link>
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

            {/* ── page body ── */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

                {/* ── role header card ── */}
                <div style={{
                    background: '#fff', border: `${m.is_featured ? '1.5px' : '1px'} solid ${m.is_featured ? 'var(--sea3)' : 'var(--wire)'}`,
                    borderRadius: 12, padding: '20px 22px', marginBottom: 18, position: 'relative', overflow: 'hidden',
                }}>
                    {/* accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bar }} />

                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        {/* logo */}
                        <div style={{
                            width: 54, height: 54, borderRadius: 12, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 500,
                            background: logo.bg, color: logo.color, border: `1px solid ${logo.border}`,
                        }}>
                            {coInitials(co)}
                        </div>

                        {/* body */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 3 }}>{co}</div>

                            {/* title row */}
                            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-head)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                                {m.title}
                                {m.is_featured  && <span className="badge badge-sea"  style={{ fontSize: 10 }}>Featured</span>}
                                {m.is_exclusive && <span className="badge badge-gold" style={{ fontSize: 10 }}>⭐ Exclusive</span>}
                                {hasIdealCandidates && <span className="badge badge-ruby" style={{ fontSize: 10 }}>DO NOT CONTACT refs</span>}
                            </div>

                            {/* meta chips */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                {m.contract_type && <Chip>💼 {CONTRACT[m.contract_type] || m.contract_type}</Chip>}
                                {m.location      && <Chip>📍 {m.location}</Chip>}
                                {m.salary_min && m.salary_max && <Chip>💰 {m.salary_currency} {fmtK(m.salary_min)} – {fmtK(m.salary_max)}</Chip>}
                                {m.industry      && <Chip>🏢 {m.industry}</Chip>}
                                {sen             && <span className={sen.cls} style={{ fontSize: 10 }}>{sen.label}</span>}
                                <Chip>👥 {openings} opening{openings !== 1 ? 's' : ''}</Chip>
                                {m.is_remote     && <Chip>🏠 Remote</Chip>}
                            </div>

                            {/* description */}
                            {m.description && (
                                <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.65 }}>
                                    {m.description.length > 300 ? m.description.slice(0, 300) + '…' : m.description}
                                </div>
                            )}
                        </div>

                        {/* right reward panel */}
                        <div style={{ minWidth: 200, textAlign: 'right', borderLeft: '1px solid var(--wire)', paddingLeft: 18, flexShrink: 0 }}>
                            {reward ? (
                                <>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Base hire reward</div>
                                    <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                                        {isSingle ? `${reward.currency} ${fmtK(reward.min)}` : `${reward.currency} ${fmtK(reward.min)} – ${fmtK(reward.max)}`}
                                    </div>
                                    {reward.subLabel && <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 10 }}>{reward.subLabel}</div>}
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Reward</div>
                                    <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>TBD</div>
                                </>
                            )}

                            <div style={{ height: 1, background: 'var(--wire)', margin: '6px 0' }} />
                            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 2 }}>Total base reward</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-head)', marginBottom: 12 }}>
                                {totalMin
                                    ? (totalMin === totalMax
                                        ? `${reward.currency} ${fmtK(totalMin)}+`
                                        : `${reward.currency} ${fmtK(totalMin)}–${fmtK(totalMax)}+`)
                                    : '—'}
                            </div>

                            {/* CTA */}
                            {isRecruiter ? (
                                claimStatus === 'approved' ? (
                                    <Link href={route('recruiter.mandates.workspace', m.id)} style={{
                                        display: 'block', padding: '8px 0', fontSize: 12, fontWeight: 500,
                                        border: '1px solid var(--jade3)', borderRadius: 7, background: 'var(--jade-pale)',
                                        color: 'var(--jade2)', textAlign: 'center', textDecoration: 'none',
                                    }}>
                                        Open workspace →
                                    </Link>
                                ) : claimStatus === 'rejected' ? (
                                    <div style={{ fontSize: 12, color: 'var(--ruby2)', padding: '8px 0', textAlign: 'center' }}>
                                        Claim rejected
                                    </div>
                                ) : claimStatus === 'pending' ? (
                                    <div style={{ fontSize: 12, color: 'var(--amber2)', padding: '8px 0', textAlign: 'center' }}>
                                        ⏳ Awaiting admin approval
                                    </div>
                                ) : atCapacity ? (
                                    <button disabled style={{
                                        width: '100%', padding: '8px 0', fontSize: 12,
                                        border: '1px solid var(--wire2)', borderRadius: 7, background: 'var(--mist2)',
                                        color: 'var(--ink4)', cursor: 'not-allowed', fontFamily: 'var(--font)',
                                    }}>
                                        At capacity
                                    </button>
                                ) : (
                                    <Link href={route('recruiter.mandates.pick', m.id)} style={{
                                        display: 'block', padding: '8px 0', fontSize: 12, fontWeight: 500,
                                        border: '1px solid var(--sea3)', borderRadius: 7, background: 'var(--sea2)',
                                        color: '#fff', textAlign: 'center', textDecoration: 'none',
                                    }}>
                                        Pick this role →
                                    </Link>
                                )
                            ) : (
                                <Link href={route('login')} style={{
                                    display: 'block', padding: '8px 0', fontSize: 12, fontWeight: 500,
                                    border: '1px solid var(--sea3)', borderRadius: 7, background: 'var(--sea2)',
                                    color: '#fff', textAlign: 'center', textDecoration: 'none',
                                }}>
                                    Sign in to pick →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── tabs ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--wire)', marginBottom: 18 }}>
                    {/* Overview — always active */}
                    <div style={{
                        padding: '9px 18px', fontSize: 13, cursor: 'pointer',
                        borderBottom: '2px solid var(--sea3)', marginBottom: -1,
                        color: 'var(--sea)', fontWeight: 500, fontFamily: 'var(--font)',
                    }}>
                        Overview
                    </div>
                    {/* Disabled tabs */}
                    {['Candidates', 'AI matching', 'Activity log'].map(label => (
                        <div key={label} title="Available after you pick this role" style={{
                            padding: '9px 18px', fontSize: 13,
                            borderBottom: '2px solid transparent', marginBottom: -1,
                            color: 'var(--wire)', fontFamily: 'var(--font)',
                            cursor: 'not-allowed', userSelect: 'none',
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                            {label}
                            <span style={{ fontSize: 9, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)', borderRadius: 3, padding: '1px 4px' }}>🔒</span>
                        </div>
                    ))}
                </div>

                {/* ── overview content ── */}
                <div>

                    {/* Job description */}
                    <Sblock title="📄 Job description">
                        {m.description ? (
                            <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                                {m.description}
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: 'var(--ink4)', fontStyle: 'italic' }}>No description provided.</div>
                        )}
                    </Sblock>

                    {/* Screening flags */}
                    {hasFlags && (
                        <Sblock title="🎯 Candidate screening flags">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--jade-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</div>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--jade2)' }}>Green flags</span>
                                    </div>
                                    {(m.green_flags || []).length > 0
                                        ? (m.green_flags || []).map((f, i) => (
                                            <div key={i} style={{ fontSize: 12, padding: '6px 11px', borderRadius: 'var(--rsm)', background: 'var(--jade-pale)', color: 'var(--jade2)', marginBottom: 5 }}>✓ {f}</div>
                                          ))
                                        : <div style={{ fontSize: 12, color: 'var(--ink4)', fontStyle: 'italic' }}>None set</div>}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ruby-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✕</div>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ruby2)' }}>Red flags</span>
                                    </div>
                                    {(m.red_flags || []).length > 0
                                        ? (m.red_flags || []).map((f, i) => (
                                            <div key={i} style={{ fontSize: 12, padding: '6px 11px', borderRadius: 'var(--rsm)', background: 'var(--ruby-pale)', color: 'var(--ruby2)', marginBottom: 5 }}>✕ {f}</div>
                                          ))
                                        : <div style={{ fontSize: 12, color: 'var(--ink4)', fontStyle: 'italic' }}>None set</div>}
                                </div>
                            </div>
                        </Sblock>
                    )}

                    {/* Role requirements */}
                    {hasRequirements && (
                        <Sblock title="✅ Role requirements">
                            <div className="req-grid">
                                {(m.must_haves || []).length > 0 && (
                                    <div className="req-card">
                                        <div className="req-title">Must-have</div>
                                        {(m.must_haves || []).map((item, i) => <div key={i} className="req-item">{item}</div>)}
                                    </div>
                                )}
                                {(m.nice_to_haves || []).length > 0 && (
                                    <div className="req-card">
                                        <div className="req-title">Nice to have</div>
                                        {(m.nice_to_haves || []).map((item, i) => <div key={i} className="req-item">{item}</div>)}
                                    </div>
                                )}
                            </div>
                        </Sblock>
                    )}

                    {/* Required Q&A */}
                    {hasQA && (
                        <Sblock title="💬 Required candidate Q&A">
                            {(m.screening_questions || []).map((q, i) => (
                                <div key={i} style={{ background: 'var(--mist2)', borderRadius: 'var(--rsm)', padding: '9px 13px', marginBottom: 7, border: '1px solid var(--wire)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Question {i + 1}</div>
                                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{q}</div>
                                </div>
                            ))}
                        </Sblock>
                    )}

                    {/* Ideal candidates */}
                    {hasIdealCandidates && (
                        <Sblock title={<>👤 Ideal candidates <span style={{ fontSize: 10, background: 'var(--ruby-pale)', color: 'var(--ruby2)', border: '1px solid #F7C1C1', borderRadius: 4, padding: '1px 6px', fontWeight: 500, marginLeft: 6 }}>DO NOT CONTACT</span></>}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                                {(m.ideal_candidates || []).filter(ic => ic?.name).map((ic, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--mist2)',
                                        borderRadius: 'var(--rsm)', padding: '10px 14px', flex: '1 1 220px',
                                        position: 'relative', border: '1px solid var(--wire)',
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: '50%', background: 'var(--sea-pale)',
                                            color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, fontWeight: 500, flexShrink: 0,
                                        }}>
                                            {(ic.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ic.name}</div>
                                            {ic.title && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{ic.title}</div>}
                                        </div>
                                        {ic.linkedin_url && (
                                            <a href={ic.linkedin_url} target="_blank" rel="noreferrer"
                                               style={{ position: 'absolute', top: 8, right: 10, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}
                                               title="LinkedIn">🔗</a>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 10, background: 'var(--ruby-pale)', color: 'var(--ruby2)', border: '1px solid #F7C1C1', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>DO NOT CONTACT</span>
                                Reference profiles only — use as benchmarks for sourcing similar talent.
                            </div>
                        </Sblock>
                    )}

                    {/* Ideal source companies */}
                    {hasIdeaCompanies && (
                        <Sblock title="🏢 Ideal source companies">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                {(m.ideal_source_companies || []).map((co, i) => (
                                    <div key={i} style={{
                                        background: 'var(--mist2)', borderRadius: 'var(--rsm)', padding: '13px 8px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                        border: '1px solid var(--wire)',
                                    }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: '50%', background: 'var(--sea-pale)',
                                            color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 10, fontWeight: 500,
                                        }}>
                                            {(co || '').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink)', textAlign: 'center' }}>{co}</div>
                                    </div>
                                ))}
                            </div>
                        </Sblock>
                    )}

                    {/* CTA footer — sign-in prompt for non-recruiters */}
                    {!isRecruiter && (
                        <div style={{
                            marginTop: 28, padding: '28px 24px', background: '#fff', borderRadius: 12,
                            border: '1px solid var(--wire)', textAlign: 'center',
                        }}>
                            <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                                Ready to pick this role?
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 20 }}>
                                Sign in as a recruiter to pick this mandate, submit candidates, and earn placement fees.
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                                <Link href={route('login')} style={{
                                    padding: '9px 22px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                                    background: 'var(--sea2)', color: '#fff', textDecoration: 'none', fontFamily: 'var(--font)',
                                }}>
                                    Sign in
                                </Link>
                                <Link href={route('public.roles')} style={{
                                    padding: '9px 22px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                                    border: '1px solid var(--wire2)', background: '#fff', color: 'var(--ink)',
                                    textDecoration: 'none', fontFamily: 'var(--font)',
                                }}>
                                    ← Back to listings
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// ─── Sblock (collapsible section) ─────────────────────────────────────────────

function Sblock({ title, children }) {
    const [open, setOpen] = useState(true)
    return (
        <div className="sblock" style={{ marginBottom: 10 }}>
            <div className="sblock-head" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="sblock-title">{title}</div>
                <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && <div className="sblock-body">{children}</div>}
        </div>
    )
}

// ─── Chip ──────────────────────────────���──────────────────────────────────────

function Chip({ children }) {
    return (
        <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>
            {children}
        </span>
    )
}
