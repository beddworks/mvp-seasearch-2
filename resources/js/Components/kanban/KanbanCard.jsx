import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { initials, fmtRelative, stageColor } from '@/lib/utils'

export default function KanbanCard({ card, onClick, onReject }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : (card.client_status === 'rejected' ? 0.65 : 1),
        background: '#fff',
        border: `1px solid var(--wire)`,
        borderStyle: card.client_status === 'rejected' ? 'dashed' : 'solid',
        borderRadius: 'var(--rsm)',
        padding: '8px 10px',
        cursor: 'grab',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
    }

    const score = card.ai_score
    const scoreColor = score >= 80 ? 'var(--jade2)' : score >= 60 ? 'var(--amber2)' : 'var(--ruby2)'
    const c = card.candidate ?? {}

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
            {/* 3px top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stageColor(card.client_status) }} />

            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 5, marginTop: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                    {initials((c.first_name ?? '') + ' ' + (c.last_name ?? ''))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.first_name} {c.last_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.current_role}{c.current_company ? ` · ${c.current_company}` : ''}
                    </div>
                </div>
                {score != null && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: scoreColor, flexShrink: 0, fontFamily: 'var(--mono)' }}>{score}</div>
                )}
            </div>

            {score != null && (
                <div style={{ height: 3, background: 'var(--wire)', borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ height: 3, borderRadius: 2, background: scoreColor, width: `${score}%` }} />
                </div>
            )}

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                {c.cv_url && <span className="cbadge cb-jade">CV ✓</span>}
                {card.interview_date && (
                    <span className="cbadge cb-vio">
                        {new Date(card.interview_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                    </span>
                )}
                {card.client_feedback && <span className="cbadge cb-sea">Feedback</span>}
                {card.exception_bypass && <span className="cbadge cb-vio">Trusted</span>}
                {card.client_rejection_reason && <span className="cbadge cb-rub">{card.client_rejection_reason}</span>}
            </div>

            {card.recruiter_note && (
                <div style={{ fontSize: 10, color: 'var(--ink4)', borderLeft: '2px solid var(--wire)', paddingLeft: 6, lineHeight: 1.5, marginBottom: 4 }}>
                    {card.recruiter_note.slice(0, 60)}{card.recruiter_note.length > 60 ? '…' : ''}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{fmtRelative(card.submitted_at ?? card.created_at)}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {card.client_status !== 'rejected' && (
                        <button
                            style={{ fontSize: 11, color: 'var(--ruby2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                            onClick={e => { e.stopPropagation(); onReject(card) }}
                        >✕</button>
                    )}
                </div>
            </div>
        </div>
    )
}

export function KanbanCardDragging({ card }) {
    const c = card.candidate ?? {}
    return (
        <div style={{ background: '#fff', border: '1px solid var(--sea2)', borderRadius: 'var(--rsm)', padding: '8px 10px', opacity: 0.9, boxShadow: '0 4px 12px rgba(0,0,0,.15)', width: 210 }}>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.current_role}</div>
        </div>
    )
}
