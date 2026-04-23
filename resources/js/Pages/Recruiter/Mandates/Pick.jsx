import { useForm, usePage } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'

const SENIORITY_LABELS = { c_suite: 'C-Suite', vp_director: 'VP / Director', manager: 'Manager', ic: 'IC' }

export default function MandatePick({ mandate, alreadyClaimed }) {
    const { auth } = usePage().props
    const co = mandate.client?.company_name || '—'
    const initials2 = co.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    const { post, processing } = useForm({})

    function submit(e) {
        e.preventDefault()
        post(route('recruiter.mandates.pick.confirm', mandate.id))
    }

    const checklist = [
        'I will submit at least 1 qualified CDD within 3 days',
        'I will keep the candidate informed throughout the process',
        'I understand the 20% platform fee on successful placement',
        'I have reviewed the full job description and requirements',
    ]

    return (
        <RecruiterLayout breadcrumb={[{ label: 'Job listings', href: route('recruiter.mandates.index') }, { label: 'Pick confirmation' }]}>
            <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--mist2)' }}>
                {alreadyClaimed ? (
                    <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 14, width: '100%', maxWidth: 480, padding: 32, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Already claimed</div>
                        <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 20 }}>You've already picked this role.</div>
                        <a href={route('recruiter.mandates.workspace', mandate.id)} className="btn btn-primary">Open workspace →</a>
                    </div>
                ) : (
                    <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 14, width: '100%', maxWidth: 520, overflow: 'hidden' }}>
                        {/* Top */}
                        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--wire)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--jade-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid var(--jade3)', fontSize: 26, color: 'var(--jade2)' }}>
                                ✓
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Confirm role pick</div>
                            <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.55 }}>
                                You're claiming this role. Admin will review and assign Day 0.
                            </div>
                        </div>

                        {/* Role card */}
                        <div style={{ margin: '16px 24px', background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--sea-pale)', color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, border: '1px solid var(--wire)' }}>
                                    {initials2}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{mandate.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{co}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                {[
                                    { val: mandate.location || '—', lbl: 'Location' },
                                    { val: mandate.seniority ? SENIORITY_LABELS[mandate.seniority] : '—', lbl: 'Level' },
                                    { val: mandate.openings_count + '×', lbl: 'Openings' },
                                ].map(({ val, lbl }) => (
                                    <div key={lbl} style={{ textAlign: 'center', background: '#fff', border: '1px solid var(--wire)', borderRadius: 6, padding: '8px 6px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{val}</div>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 1 }}>{lbl}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wire)' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>By picking this role, you confirm:</div>
                            {checklist.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--ink4)', lineHeight: 1.5 }}>
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--jade-pale)', color: 'var(--jade2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</div>
                                    {item}
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={processing} style={{ justifyContent: 'center' }}>
                                {processing ? 'Claiming…' : '🎯 Confirm & claim role'}
                            </button>
                            <a href={route('recruiter.mandates.index')} className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                                Cancel — go back to listings
                            </a>
                        </div>
                    </form>
                )}
            </div>
        </RecruiterLayout>
    )
}
