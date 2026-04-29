import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
    DndContext, DragOverlay, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core'
import RecruiterLayout from '@/Layouts/RecruiterLayout'
import AdminLayout from '@/Layouts/AdminLayout'
import ClientLayout from '@/Layouts/ClientLayout'
import KanbanColumn from '@/Components/kanban/KanbanColumn'
import KanbanSidePanel from '@/Components/kanban/KanbanSidePanel'
import RejectionModal from '@/Components/kanban/RejectionModal'
import AddCandidateModal from '@/Components/kanban/AddCandidateModal'
import SubmitToClientModal from '@/Components/kanban/SubmitToClientModal'
import { KanbanCardDragging } from '@/Components/kanban/KanbanCard'
import { initials } from '@/lib/utils'

const STAGE_LABELS = {
    sourced: 'Sourced', screened: 'Screened', interview: 'Interview',
    offered: 'Offered', hired: 'Hired', rejected: 'Rejected',
}

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function KanbanShow({ mandate, claim, submissions: rawSubs, stages, stats, viewOnly = false, layoutRole = 'recruiter', backRoute = null }) {
    const [cards, setCards] = useState(() =>
        rawSubs.reduce((acc, s) => {
            const stage = s.client_status || 'sourced'
            acc[stage] = [...(acc[stage] ?? []), s]
            return acc
        }, {})
    )
    const [activeCard, setActiveCard]   = useState(null)
    const [sidePanel, setSidePanel]     = useState(null)
    const [rejectModal, setRejectModal] = useState(null)
    const [addModal, setAddModal]       = useState(false)
    const [submitModal, setSubmitModal] = useState(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const allCards = () => Object.values(cards).flat()

    function handleDragStart({ active }) {
        setActiveCard(allCards().find(c => c.id === active.id) ?? null)
    }

    function handleDragEnd({ active, over }) {
        if (!over) { setActiveCard(null); return }
        const newStage = over.id
        const card = allCards().find(c => c.id === active.id)
        if (!card || card.client_status === newStage) { setActiveCard(null); return }

        moveCard(card.id, newStage)
        setActiveCard(null)

        if (!viewOnly) {
            fetch(route(routeBase + '.move'), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: card.id, new_stage: newStage }),
            })
        }
    }

    function moveCard(submissionId, newStage) {
        setCards(prev => {
            const updated = {}
            Object.keys(prev).forEach(s => { updated[s] = [...(prev[s] ?? [])] })
            const card = Object.values(updated).flat().find(c => c.id === submissionId)
            if (!card) return prev
            Object.keys(updated).forEach(s => {
                updated[s] = updated[s].filter(c => c.id !== submissionId)
            })
            updated[newStage] = [...(updated[newStage] ?? []), { ...card, client_status: newStage }]
            return updated
        })

        // Also update side panel if it's the same card
        if (sidePanel?.id === submissionId) {
            setSidePanel(p => p ? { ...p, client_status: newStage } : null)
        }
    }

    const breadcrumb = layoutRole === 'admin'
        ? [{ label: 'Mandates', href: route('admin.mandates.index') }, { label: mandate.title }]
        : layoutRole === 'client'
        ? [{ label: 'My Roles', href: route('client.mandates.index') }, { label: mandate.title }]
        : [{ label: 'Job listings', href: route('recruiter.mandates.index') }, { label: mandate.title }]

    const routeBase = layoutRole === 'admin' ? 'admin.kanban' : layoutRole === 'client' ? 'client.kanban' : 'recruiter.kanban'
    const Layout = layoutRole === 'admin' ? AdminLayout : layoutRole === 'client' ? ClientLayout : RecruiterLayout
    const recruiterAddCandidateUrl = route('recruiter.mandates.add-candidate', mandate.id)
    const adminAddCandidateUrl = route('admin.mandates.add-candidate', mandate.id)

    function openAddCandidate() {
        if (layoutRole === 'recruiter') {
            router.visit(recruiterAddCandidateUrl)
            return
        }
        if (layoutRole === 'admin') {
            router.visit(adminAddCandidateUrl)
            return
        }
        setAddModal(true)
    }

    return (
        <Layout breadcrumb={breadcrumb} noPadding>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                {/* Board topbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid var(--wire)', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, border: '1px solid var(--wire)', flexShrink: 0 }}>
                            {initials(mandate.client?.company_name ?? '')}
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {mandate.title}
                                {mandate.is_exclusive && <span className="cbadge cb-gld">Exclusive</span>}
                                <span className="cbadge cb-jade">Picked</span>
                                {viewOnly && <span className="cbadge cb-sea">View Only</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{mandate.client?.company_name}</div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 20, marginLeft: 12 }}>
                        {[
                            ['Total', stats.total],
                            ['Top match', stats.top_score ? `${stats.top_score}%` : '—'],
                            ['Days active', stats.days_active],
                            ['Submitted', stats.submitted],
                        ].map(([l, v]) => (
                            <div key={l} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--ink)' }}>{v}</div>
                                <div style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        {viewOnly ? (
                            backRoute && <a href={backRoute} className="btn btn-secondary btn-sm">← Back</a>
                        ) : layoutRole === 'client' ? (
                            backRoute && <a href={backRoute} className="btn btn-secondary btn-sm">← My Roles</a>
                        ) : (
                            <>
                                {layoutRole === 'recruiter' ? (
                                    <Link href={recruiterAddCandidateUrl} className="btn btn-secondary btn-sm">+ Add candidate</Link>
                                ) : layoutRole === 'admin' ? (
                                    <Link href={adminAddCandidateUrl} className="btn btn-secondary btn-sm">+ Add candidate</Link>
                                ) : (
                                    <button className="btn btn-secondary btn-sm" onClick={() => setAddModal(true)}>+ Add candidate</button>
                                )}
                               
                            </>
                        )}
                    </div>
                </div>

                {/* Board + side panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflowX: 'auto', padding: '14px 16px' }}>
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(200px, 1fr))`, gap: 8, height: '100%', minWidth: stages.length * 210 }}>
                                {stages.map(stage => (
                                    <KanbanColumn
                                        key={stage}
                                        stage={stage}
                                        label={STAGE_LABELS[stage]}
                                        cards={cards[stage] ?? []}
                                        onCardClick={setSidePanel}
                                        onReject={viewOnly ? null : setRejectModal}
                                        onAdd={viewOnly ? null : openAddCandidate}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeCard && <KanbanCardDragging card={activeCard} />}
                            </DragOverlay>
                        </DndContext>
                    </div>

                    {sidePanel && (
                        <KanbanSidePanel
                            submission={sidePanel}
                            stages={stages}
                            mandate={mandate}
                            onClose={() => setSidePanel(null)}
                            onMove={viewOnly ? null : moveCard}
                            onReject={viewOnly || layoutRole === 'client' ? null : setRejectModal}
                            onSubmitToClient={viewOnly || layoutRole === 'client' ? null : setSubmitModal}
                            canScheduleInterview={layoutRole !== 'client'}
                            routeBase={routeBase}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            {!viewOnly && layoutRole !== 'client' && rejectModal && (
                <RejectionModal
                    submission={rejectModal}
                    onClose={() => setRejectModal(null)}
                    onConfirm={({ type, note }) => {
                        fetch(route(routeBase + '.reject'), {
                            method: 'POST',
                            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
                            body: JSON.stringify({ submission_id: rejectModal.id, rejection_reason: type, rejection_note: note }),
                        }).then(() => moveCard(rejectModal.id, 'rejected'))
                        setRejectModal(null)
                    }}
                />
            )}

            {!viewOnly && layoutRole !== 'client' && addModal && (
                <AddCandidateModal
                    mandateId={mandate.id}
                    onClose={() => setAddModal(false)}
                    routeBase={routeBase}
                    onSuccess={sub => {
                        setCards(prev => ({
                            ...prev,
                            [sub.client_status]: [...(prev[sub.client_status] ?? []), sub],
                        }))
                        setAddModal(false)
                    }}
                />
            )}

            {!viewOnly && layoutRole !== 'client' && submitModal && (
                <SubmitToClientModal
                    submission={submitModal}
                    onClose={() => setSubmitModal(null)}
                    routeBase={routeBase}
                    onSuccess={() => setSubmitModal(null)}
                />
            )}
        </Layout>
    )
}
