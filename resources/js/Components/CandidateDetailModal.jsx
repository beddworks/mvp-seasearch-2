import { useState } from 'react'

function initials(first = '', last = '') {
    return `${(first || '').slice(0, 1)}${(last || '').slice(0, 1)}`.toUpperCase()
}

export default function CandidateDetailModal({ submission, onClose }) {
    if (!submission) return null

    const c = submission.candidate
    const score = submission.ai_score || 0
    const breakdown = submission.score_breakdown || {}
    const greenFlags = submission.green_flags || []
    const redFlags = submission.red_flags || []

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: '#fff',
                borderRadius: 'var(--r)',
                maxWidth: 700,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                position: 'relative',
            }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: 'none',
                        border: 'none',
                        fontSize: 20,
                        color: 'var(--ink4)',
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                >
                    ✕
                </button>

                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--wire)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: 'var(--sea-pale)',
                            color: 'var(--sea2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 600,
                            flexShrink: 0,
                        }}>
                            {c ? initials(c.first_name, c.last_name) : 'CV'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                                {c ? `${c.first_name} ${c.last_name}` : `Candidate #${submission.submission_number}`}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 8 }}>
                                {c && [c.current_role, c.current_company].filter(Boolean).join(' · ')}
                            </div>
                            {score > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        fontSize: 28,
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-head)',
                                        color: score >= 80 ? 'var(--jade2)' : (score >= 60 ? 'var(--amber2)' : 'var(--ruby2)'),
                                    }}>
                                        {score}%
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', lineHeight: 1.4 }}>
                                        <div style={{ fontFamily: 'var(--mono)' }}>AI Match Score</div>
                                        <div>{score >= 80 ? 'Strong' : (score >= 60 ? 'Moderate' : 'Weak')} match</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                    {/* Contact info */}
                    {c && (c.email || c.linkedin_url) && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>Contact</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {c.email && (
                                    <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: 'var(--sea2)', textDecoration: 'none' }}>
                                        {c.email}
                                    </a>
                                )}
                                {c.linkedin_url && (
                                    <a href={c.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--sea2)', textDecoration: 'none' }}>
                                        {c.linkedin_url}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AI Breakdown */}
                    {score > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>AI Match Breakdown</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                                {[
                                    ['experience', 'Experience', 'var(--sea3)'],
                                    ['industry_fit', 'Industry fit', 'var(--jade2)'],
                                    ['scope_match', 'Scope match', 'var(--violet2)'],
                                    ['leadership', 'Leadership', 'var(--amber2)'],
                                ].map(([k, label, color]) => (
                                    <div key={k}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
                                            <span style={{ color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{breakdown[k] || 0}%</span>
                                        </div>
                                        <div style={{ height: 5, background: 'var(--mist2)', borderRadius: 3 }}>
                                            <div style={{ width: `${breakdown[k] || 0}%`, height: 5, borderRadius: 3, background: color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Green & Red Flags */}
                    {(greenFlags.length > 0 || redFlags.length > 0) && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>AI Insights</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {greenFlags.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--jade2)', marginBottom: 5 }}>Strengths</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {greenFlags.map((flag, i) => (
                                                <div key={i} style={{ fontSize: 11, padding: '5px 8px', borderRadius: 'var(--rsm)', background: 'var(--jade-pale)', color: 'var(--jade2)' }}>
                                                    ✓ {flag}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {redFlags.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ruby2)', marginBottom: 5 }}>Concerns</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {redFlags.map((flag, i) => (
                                                <div key={i} style={{ fontSize: 11, padding: '5px 8px', borderRadius: 'var(--rsm)', background: 'var(--ruby-pale)', color: 'var(--ruby2)' }}>
                                                    ⚠ {flag}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AI Summary */}
                    {submission.ai_summary && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>AI Summary</div>
                            <div style={{
                                fontSize: 12,
                                color: 'var(--ink)',
                                lineHeight: 1.7,
                                background: 'var(--mist2)',
                                padding: '10px 12px',
                                borderRadius: 'var(--rsm)',
                                borderLeft: '2px solid var(--sea2)',
                            }}>
                                {submission.ai_summary}
                            </div>
                        </div>
                    )}

                    {/* Candidate Profile */}
                    {c && (c.skills || c.years_experience) && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>Profile</div>
                            {c.years_experience && (
                                <div style={{ fontSize: 11, marginBottom: 6 }}>
                                    <strong>Experience:</strong> {c.years_experience} years
                                </div>
                            )}
                            {Array.isArray(c.skills) && c.skills.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, marginBottom: 4 }}><strong>Skills:</strong></div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {c.skills.slice(0, 8).map((skill, i) => (
                                            <span key={i} style={{
                                                fontSize: 10,
                                                padding: '3px 8px',
                                                borderRadius: 16,
                                                background: 'var(--sea-pale)',
                                                color: 'var(--sea2)',
                                            }}>
                                                {skill}
                                            </span>
                                        ))}
                                        {c.skills.length > 8 && (
                                            <span style={{ fontSize: 10, color: 'var(--ink4)', alignSelf: 'center' }}>
                                                +{c.skills.length - 8} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CV Link */}
                    {c && c.cv_url && (
                        <div style={{ marginBottom: 10 }}>
                            <a href={c.cv_url} target="_blank" rel="noreferrer" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 'var(--rsm)',
                                background: 'var(--sea-pale)',
                                color: 'var(--sea2)',
                                textDecoration: 'none',
                                fontSize: 11,
                                fontWeight: 500,
                            }}>
                                📄 View CV
                            </a>
                        </div>
                    )}
                </div>

                {/* Close button at bottom */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--wire)', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary btn-sm"
                        style={{ marginLeft: 'auto' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
