import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import { stageColor } from '@/lib/utils'

export default function KanbanColumn({ stage, label, cards, onCardClick, onReject, onAdd }) {
    const { setNodeRef, isOver } = useDroppable({ id: stage })
    const color = stageColor(stage)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)' }}>{label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 10, padding: '1px 5px', fontFamily: 'var(--mono)', color: 'var(--ink4)' }}>
                        {cards.length}
                    </span>
                </div>
                <button onClick={onAdd} style={{ fontSize: 14, color: 'var(--ink4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>+</button>
            </div>

            {/* Drop zone */}
            <div ref={setNodeRef} style={{
                flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
                background: isOver ? 'rgba(11,79,138,0.04)' : 'transparent',
                borderRadius: 'var(--r)', transition: 'background .15s', padding: 2,
            }}>
                <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {cards.map(card => (
                        <KanbanCard
                            key={card.id}
                            card={card}
                            onClick={() => onCardClick(card)}
                            onReject={() => onReject(card)}
                        />
                    ))}
                </SortableContext>

                <div onClick={onAdd} style={{
                    minHeight: 40, border: '1.5px dashed var(--wire)', borderRadius: 'var(--rsm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--ink4)', cursor: 'pointer', transition: 'all .15s',
                }}>
                    + Add candidate
                </div>
            </div>
        </div>
    )
}
