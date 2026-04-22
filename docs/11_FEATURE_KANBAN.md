# 11 — Feature: Kanban Pipeline (Full)
> SeaSearch PRD v3.0  
> 6 columns · @dnd-kit drag-drop · Side panel · All modals · MySQL-compatible

---

## Overview

The Kanban board is per-mandate. One board per role the recruiter has claimed.

**6 columns map to `cdd_submissions.client_status`:**

| Column | Status value | Color |
|--------|-------------|-------|
| Sourced | `sourced` | `var(--mist4)` |
| Screened | `screened` | `var(--amber2)` |
| Interview | `interview` | `var(--sea2)` |
| Offered | `offered` | `var(--violet2)` |
| Hired | `hired` | `var(--jade2)` |
| Rejected | `rejected` | `var(--ruby2)` |

**Internal stages** (sourced, screened) = pre-submission — tracked locally, not forwarded to client.  
**Submitted** = `admin_review_status IN ('approved','bypassed')`.

---

## KanbanController (7 methods)

```php
// app/Http/Controllers/Recruiter/KanbanController.php
class KanbanController extends Controller
{
    // 1. Show board
    public function show(Mandate $mandate): Response
    {
        $recruiter = auth()->user()->recruiter;

        $claim = MandateClaim::where('mandate_id', $mandate->id)
            ->where('recruiter_id', $recruiter->id)
            ->where('status', 'approved')
            ->firstOrFail();

        $submissions = CddSubmission::with(['candidate','placement'])
            ->where('mandate_id', $mandate->id)
            ->where('recruiter_id', $recruiter->id)
            ->get();

        return Inertia::render('Recruiter/Kanban/Show', [
            'mandate'     => MandateDetailResource::make($mandate->load('client')),
            'claim'       => ClaimResource::make($claim),
            'submissions' => CddSubmissionResource::collection($submissions),
            'stages'      => ['sourced','screened','interview','offered','hired','rejected'],
            'stats'       => [
                'total'       => $submissions->count(),
                'top_score'   => $submissions->max('ai_score') ?? 0,
                'days_active' => (int) now()->diffInDays($claim->assigned_at),
                'submitted'   => $submissions->whereIn('admin_review_status',['approved','bypassed'])->count(),
            ],
        ]);
    }

    // 2. Move card between columns
    public function move(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'new_stage'     => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
        ]);

        $submission = CddSubmission::findOrFail($request->submission_id);
        abort_if($submission->recruiter_id !== auth()->user()->recruiter->id, 403);

        $submission->update(['client_status' => $request->new_stage]);

        // Sync GSheet if already forwarded to client
        if (in_array($submission->admin_review_status, ['approved','bypassed'])) {
            SyncGSheetJob::dispatch($submission, 'update_status')->onQueue('sheets');
        }

        // If hired — trigger commission settlement
        if ($request->new_stage === 'hired') {
            app(CommissionService::class)->settle($submission);
        }

        return response()->json(['success' => true, 'new_stage' => $request->new_stage]);
    }

    // 3. Schedule interview from side panel
    public function scheduleInterview(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'submission_id'   => 'required|string|exists:cdd_submissions,id',
            'interview_date'  => 'required|date',
            'interview_format'=> 'nullable|in:in_person,video,panel',
            'interview_notes' => 'nullable|string|max:1000',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        abort_if($sub->recruiter_id !== auth()->user()->recruiter->id, 403);

        $sub->update([
            'interview_date'   => $request->interview_date,
            'interview_format' => $request->interview_format,
            'interview_notes'  => $request->interview_notes,
            'client_status'    => 'interview',
        ]);

        return response()->json(['success' => true, 'submission' => $sub->fresh()->toArray()]);
    }

    // 4. Save client feedback note in side panel
    public function saveClientFeedback(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'submission_id'             => 'required|string',
            'client_feedback'           => 'required|string|max:2000',
            'client_feedback_sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        abort_if($sub->recruiter_id !== auth()->user()->recruiter->id, 403);

        $sub->update([
            'client_feedback'           => $request->client_feedback,
            'client_feedback_sentiment' => $request->client_feedback_sentiment,
        ]);

        return response()->json(['success' => true]);
    }

    // 5. Submit to client (triggers admin review or bypass)
    public function submitToClient(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'submission_id'  => 'required|string|exists:cdd_submissions,id',
            'recruiter_note' => 'nullable|string|max:1000',
        ]);

        $sub      = CddSubmission::findOrFail($request->submission_id);
        $recruiter = auth()->user()->recruiter;
        abort_if($sub->recruiter_id !== $recruiter->id, 403);

        if (in_array($sub->admin_review_status, ['approved','bypassed'])) {
            return response()->json(['error' => 'Already submitted to client.'], 422);
        }

        if ($request->recruiter_note) {
            $sub->update(['recruiter_note' => $request->recruiter_note]);
        }

        // Check exception rule
        $bypass = app(ExceptionService::class)->shouldBypass($recruiter, $sub->mandate);

        $sub->update([
            'admin_review_status' => $bypass ? 'bypassed' : 'pending',
            'exception_bypass'    => $bypass,
        ]);

        if ($bypass) {
            app(CddService::class)->forwardToClient($sub);
        } else {
            app(NotificationService::class)->cddPendingAdminReview($sub);
        }

        // Check slot cycle — freed if this is the 3rd submission
        app(SlotService::class)->checkAndFreeSlot($sub->mandate, $recruiter->id);

        return response()->json([
            'success'  => true,
            'bypassed' => $bypass,
            'message'  => $bypass ? 'Sent directly to client.' : 'Sent for admin review.',
        ]);
    }

    // 6. Reject candidate from kanban
    public function reject(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'submission_id'    => 'required|string|exists:cdd_submissions,id',
            'rejection_reason' => 'required|in:client,withdrew,unsuitable,compensation',
            'rejection_note'   => 'nullable|string|max:500',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        abort_if($sub->recruiter_id !== auth()->user()->recruiter->id, 403);

        $sub->update([
            'client_status'            => 'rejected',
            'client_rejection_reason'  => $request->rejection_reason,
            'client_status_updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    // 7. Add candidate directly from kanban board
    public function addCandidate(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'mandate_id'      => 'required|string|exists:mandates,id',
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'email'           => 'nullable|email',
            'linkedin_url'    => 'nullable|url',
            'current_role'    => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'initial_stage'   => 'required|in:sourced,screened',
            'cv'              => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $recruiter = auth()->user()->recruiter;

        $candidate = Candidate::create([
            'recruiter_id'   => $recruiter->id,
            'first_name'     => $request->first_name,
            'last_name'      => $request->last_name,
            'email'          => $request->email,
            'linkedin_url'   => $request->linkedin_url,
            'current_role'   => $request->current_role,
            'current_company'=> $request->current_company,
        ]);

        if ($request->hasFile('cv')) {
            $path = $request->file('cv')->store("cvs/{$recruiter->id}/{$candidate->id}", 's3');
            $candidate->update([
                'cv_url'           => $path,
                'cv_original_name' => $request->file('cv')->getClientOriginalName(),
                'cv_uploaded_at'   => now(),
            ]);
            ParseCvJob::dispatch($candidate, $request->mandate_id)->onQueue('ai');
        }

        $submission = CddSubmission::create([
            'mandate_id'          => $request->mandate_id,
            'recruiter_id'        => $recruiter->id,
            'candidate_id'        => $candidate->id,
            'client_status'       => $request->initial_stage,
            'admin_review_status' => 'pending',
        ]);

        return response()->json([
            'success'    => true,
            'submission' => CddSubmissionResource::make($submission->load('candidate')),
            'parsing'    => $request->hasFile('cv'),
        ]);
    }
}
```

---

## Routes

```php
// routes/web.php
Route::middleware(['auth','role:recruiter'])->prefix('recruiter')->name('recruiter.')->group(function () {
    Route::get('/kanban/{mandate}',            [KanbanController::class, 'show'])->name('kanban.show');
    Route::post('/kanban/move',                [KanbanController::class, 'move'])->name('kanban.move');
    Route::post('/kanban/schedule-interview',  [KanbanController::class, 'scheduleInterview'])->name('kanban.schedule-interview');
    Route::post('/kanban/save-feedback',       [KanbanController::class, 'saveClientFeedback'])->name('kanban.save-feedback');
    Route::post('/kanban/submit-to-client',    [KanbanController::class, 'submitToClient'])->name('kanban.submit-to-client');
    Route::post('/kanban/reject',              [KanbanController::class, 'reject'])->name('kanban.reject');
    Route::post('/kanban/add-candidate',       [KanbanController::class, 'addCandidate'])->name('kanban.add-candidate');
});
```

---

## React Kanban Page

```jsx
// Pages/Recruiter/Kanban/Show.jsx
import { useState } from 'react'
import {
    DndContext, DragOverlay, PointerSensor,
    useSensor, useSensors, useDroppable
} from '@dnd-kit/core'
import {
    SortableContext, useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RecruiterLayout from '@/Components/layout/RecruiterLayout'
import KanbanSidePanel from '@/Components/kanban/KanbanSidePanel'
import RejectionModal from '@/Components/kanban/RejectionModal'
import AddCandidateModal from '@/Components/kanban/AddCandidateModal'
import SubmitToClientModal from '@/Components/kanban/SubmitToClientModal'
import { initials, fmtRelative, stageColor } from '@/lib/utils'

const STAGE_LABELS = {
    sourced: 'Sourced', screened: 'Screened', interview: 'Interview',
    offered: 'Offered', hired: 'Hired', rejected: 'Rejected',
}

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function KanbanShow({ mandate, claim, submissions: rawSubs, stages, stats }) {
    // Group submissions by stage
    const [cards, setCards] = useState(() =>
        rawSubs.reduce((acc, s) => {
            acc[s.client_status] = [...(acc[s.client_status] ?? []), s]
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
        setActiveCard(allCards().find(c => c.id === active.id))
    }

    function handleDragEnd({ active, over }) {
        if (!over) return
        const newStage = over.id
        const card = allCards().find(c => c.id === active.id)
        if (!card || card.client_status === newStage) return

        // Optimistic update
        moveCard(card.id, newStage)
        setActiveCard(null)

        // Persist
        fetch(route('recruiter.kanban.move'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: card.id, new_stage: newStage }),
        })
    }

    function moveCard(submissionId, newStage) {
        setCards(prev => {
            const updated = { ...prev }
            const card = Object.values(updated).flat().find(c => c.id === submissionId)
            if (!card) return prev
            Object.keys(updated).forEach(s => {
                updated[s] = (updated[s] ?? []).filter(c => c.id !== submissionId)
            })
            updated[newStage] = [...(updated[newStage] ?? []), { ...card, client_status: newStage }]
            return updated
        })
        if (sidePanel?.id === submissionId) {
            setSidePanel(p => ({ ...p, client_status: newStage }))
        }
    }

    return (
        <RecruiterLayout>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                {/* Topbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid var(--wire)', padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, border: '1px solid var(--wire)', flexShrink: 0 }}>
                            {initials(mandate.client?.company_name ?? '')}
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {mandate.title}
                                {mandate.is_exclusive && <span className="cbadge cb-gld">Exclusive</span>}
                                <span className="cbadge cb-jade">Picked</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{mandate.client?.company_name}</div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 20, marginLeft: 12 }}>
                        {[
                            ['Total', stats.total],
                            ['Top match', `${stats.top_score}%`],
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
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddModal(true)}>+ Add candidate</button>
                        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--violet2)', borderColor: 'var(--violet-soft)' }}>✦ AI matching</button>
                        <button className="btn btn-primary btn-sm"
                            onClick={() => {
                                const unsent = allCards().find(c => !['approved','bypassed'].includes(c.admin_review_status))
                                if (unsent) setSubmitModal(unsent)
                            }}>
                            Submit to client
                        </button>
                    </div>
                </div>

                {/* Board + side panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflowX: 'auto', padding: '14px 16px' }}>
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(210px, 1fr))`, gap: 8, height: '100%', minWidth: stages.length * 220 }}>
                                {stages.map(stage => (
                                    <KanbanColumn
                                        key={stage}
                                        stage={stage}
                                        label={STAGE_LABELS[stage]}
                                        cards={cards[stage] ?? []}
                                        onCardClick={setSidePanel}
                                        onReject={setRejectModal}
                                        onAdd={() => setAddModal(true)}
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
                            onMove={moveCard}
                            onReject={setRejectModal}
                            onSubmitToClient={setSubmitModal}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            {rejectModal && (
                <RejectionModal
                    submission={rejectModal}
                    onClose={() => setRejectModal(null)}
                    onConfirm={({ type, note }) => {
                        fetch(route('recruiter.kanban.reject'), {
                            method: 'POST',
                            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
                            body: JSON.stringify({ submission_id: rejectModal.id, rejection_reason: type, rejection_note: note }),
                        }).then(() => moveCard(rejectModal.id, 'rejected'))
                        setRejectModal(null)
                    }}
                />
            )}

            {addModal && (
                <AddCandidateModal
                    mandateId={mandate.id}
                    onClose={() => setAddModal(false)}
                    onSuccess={sub => {
                        setCards(prev => ({
                            ...prev,
                            [sub.client_status]: [...(prev[sub.client_status] ?? []), sub],
                        }))
                        setAddModal(false)
                    }}
                />
            )}

            {submitModal && (
                <SubmitToClientModal
                    submission={submitModal}
                    onClose={() => setSubmitModal(null)}
                    onSuccess={() => setSubmitModal(null)}
                />
            )}
        </RecruiterLayout>
    )
}
```

---

## KanbanColumn Component

```jsx
// Components/kanban/KanbanColumn.jsx
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

            {/* Cards */}
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

                {/* Drop zone */}
                <div onClick={onAdd} style={{
                    minHeight: 40, border: '1.5px dashed var(--wire2)', borderRadius: 'var(--rsm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--ink4)', cursor: 'pointer', transition: 'all .15s',
                }}>
                    + Add candidate
                </div>
            </div>
        </div>
    )
}
```

---

## KanbanCard Component

```jsx
// Components/kanban/KanbanCard.jsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { initials, fmtRelative, stageColor } from '@/lib/utils'

export default function KanbanCard({ card, onClick, onReject }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const score      = card.ai_score
    const scoreColor = score >= 80 ? 'var(--jade2)' : score >= 60 ? 'var(--amber2)' : 'var(--ruby2)'
    const c          = card.candidate ?? {}

    return (
        <div
            ref={setNodeRef} style={style} {...attributes} {...listeners}
            onClick={onClick}
            style={{
                ...style,
                background: '#fff',
                border: `1px solid var(--wire)`,
                borderStyle: card.client_status === 'rejected' ? 'dashed' : 'solid',
                borderRadius: 'var(--rsm)',
                padding: '8px 10px',
                cursor: 'grab',
                position: 'relative',
                overflow: 'hidden',
                opacity: card.client_status === 'rejected' ? 0.65 : 1,
                userSelect: 'none',
            }}
        >
            {/* 3px top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stageColor(card.client_status) }} />

            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 5, marginTop: 4 }}>
                {/* Avatar */}
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                    {initials((c.first_name ?? '') + ' ' + (c.last_name ?? ''))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.first_name} {c.last_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.current_role} · {c.current_company}
                    </div>
                </div>
                {/* AI score */}
                {score != null && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: scoreColor, flexShrink: 0, fontFamily: 'var(--mono)' }}>{score}</div>
                )}
            </div>

            {/* Match bar */}
            {score != null && (
                <div style={{ height: 3, background: 'var(--wire)', borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ height: 3, borderRadius: 2, background: scoreColor, width: `${score}%` }} />
                </div>
            )}

            {/* Chips */}
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

            {/* Recruiter note */}
            {card.recruiter_note && (
                <div style={{ fontSize: 10, color: 'var(--ink4)', borderLeft: '2px solid var(--wire2)', paddingLeft: 6, lineHeight: 1.5, marginBottom: 4 }}>
                    {card.recruiter_note.slice(0, 60)}{card.recruiter_note.length > 60 ? '…' : ''}
                </div>
            )}

            {/* Green / red flags */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                {card.green_flags?.slice(0, 2).map((f, i) => (
                    <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--jade-pale)', color: 'var(--jade)' }}>✓ {f}</span>
                ))}
                {card.red_flags?.slice(0, 2).map((f, i) => (
                    <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--ruby-pale)', color: 'var(--ruby)' }}>⚠ {f}</span>
                ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--wire2)', fontFamily: 'var(--mono)' }}>{fmtRelative(card.submitted_at ?? card.created_at)}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button className="dcard-ghost-btn" style={{ fontSize: 9, padding: '2px 7px' }}
                        onClick={e => { e.stopPropagation(); }}>View</button>
                    {card.client_status !== 'rejected' && (
                        <button style={{ fontSize: 11, color: 'var(--ruby2)', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); onReject(card) }}>✕</button>
                    )}
                </div>
            </div>
        </div>
    )
}

// Drag overlay version
export function KanbanCardDragging({ card }) {
    return (
        <div style={{ background: '#fff', border: '1px solid var(--sea2)', borderRadius: 'var(--rsm)', padding: '8px 10px', opacity: 0.9, boxShadow: '0 4px 12px rgba(0,0,0,.15)', width: 210 }}>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{card.candidate?.first_name} {card.candidate?.last_name}</div>
            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{card.candidate?.current_role}</div>
        </div>
    )
}
```

---

## KanbanSidePanel Component

```jsx
// Components/kanban/KanbanSidePanel.jsx
import { useState } from 'react'
import { initials, stageColor } from '@/lib/utils'

const STAGE_LABELS = {
    sourced:'Sourced', screened:'Screened', interview:'Interview',
    offered:'Offered', hired:'Hired', rejected:'Rejected',
}
const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function KanbanSidePanel({ submission, stages, mandate, onClose, onMove, onReject, onSubmitToClient }) {
    const [intDate,  setIntDate]  = useState(submission.interview_date?.slice(0,10) ?? '')
    const [intFmt,   setIntFmt]   = useState(submission.interview_format ?? 'video')
    const [intNote,  setIntNote]  = useState(submission.interview_notes ?? '')
    const [fbText,   setFbText]   = useState(submission.client_feedback ?? '')
    const [fbSent,   setFbSent]   = useState(submission.client_feedback_sentiment ?? 'positive')
    const [saving,   setSaving]   = useState(false)

    const c     = submission.candidate ?? {}
    const score = submission.ai_score
    const scoreColor = score >= 80 ? 'var(--jade2)' : score >= 60 ? 'var(--amber2)' : 'var(--ruby2)'
    const DIMS  = ['experience','industry','scope','leadership','digital']

    function saveInterview() {
        setSaving(true)
        fetch(route('recruiter.kanban.schedule-interview'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submission.id, interview_date: intDate, interview_format: intFmt, interview_notes: intNote }),
        }).then(() => { onMove(submission.id, 'interview'); setSaving(false) })
    }

    function saveFeedback() {
        fetch(route('recruiter.kanban.save-feedback'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submission.id, client_feedback: fbText, client_feedback_sentiment: fbSent }),
        })
    }

    return (
        <div style={{ width: 310, background: '#fff', borderLeft: '1px solid var(--wire)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500 }}>
                    {initials((c.first_name ?? '') + ' ' + (c.last_name ?? ''))}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.current_role} · {c.current_company}</div>
                </div>
                <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
            </div>

            {/* Stage mover */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 6 }}>Move stage</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {stages.map(s => (
                        <button key={s} onClick={() => onMove(submission.id, s)} style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)',
                            border: `1px solid ${submission.client_status === s ? stageColor(s) : 'var(--wire)'}`,
                            background: submission.client_status === s ? `${stageColor(s)}20` : 'transparent',
                            color: submission.client_status === s ? stageColor(s) : 'var(--ink4)',
                            fontWeight: submission.client_status === s ? 600 : 400,
                        }}>
                            {STAGE_LABELS[s]}
                        </button>
                    ))}
                </div>
            </div>

            {/* CV strip */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                {c.cv_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--jade-pale)', border: '1px solid var(--jade-soft)', borderRadius: 'var(--rsm)', padding: '7px 10px' }}>
                        <span>📄</span>
                        <div style={{ flex: 1, fontSize: 11, color: 'var(--jade)' }}>{c.cv_original_name?.slice(0,28)}…</div>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>View</button>
                    </div>
                ) : (
                    <div style={{ background: 'var(--mist2)', border: '1.5px dashed var(--wire2)', borderRadius: 'var(--rsm)', padding: '8px 10px', fontSize: 11, color: 'var(--ink4)', textAlign: 'center', cursor: 'pointer' }}>
                        📄 Upload CV
                    </div>
                )}
            </div>

            {/* AI score + breakdown */}
            {score != null && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)', color: scoreColor }}>{score}</div>
                            <div style={{ fontSize: 8, color: 'var(--ink4)', textTransform: 'uppercase' }}>AI</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {DIMS.map(d => (
                                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                    <div style={{ fontSize: 9, color: 'var(--ink4)', width: 66, textTransform: 'capitalize', flexShrink: 0 }}>{d}</div>
                                    <div style={{ flex: 1, height: 3, background: 'var(--wire)', borderRadius: 2 }}>
                                        <div style={{ height: 3, borderRadius: 2, background: scoreColor, width: `${submission.score_breakdown?.[d] ?? 0}%` }} />
                                    </div>
                                    <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink4)', width: 22, textAlign: 'right' }}>
                                        {submission.score_breakdown?.[d] ?? 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {submission.green_flags?.map((f,i) => <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--jade-pale)', color: 'var(--jade)' }}>✓ {f}</span>)}
                        {submission.red_flags?.map((f,i) => <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--ruby-pale)', color: 'var(--ruby)' }}>⚠ {f}</span>)}
                    </div>
                </div>
            )}

            {/* Interview scheduling */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Interview</div>
                <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={intDate} onChange={e => setIntDate(e.target.value)} style={{ fontSize: 11 }} />
                </div>
                <div className="form-group">
                    <label className="form-label">Format</label>
                    <select className="form-input" value={intFmt} onChange={e => setIntFmt(e.target.value)} style={{ fontSize: 11 }}>
                        <option value="in_person">In-person</option>
                        <option value="video">Video call</option>
                        <option value="panel">Panel</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input className="form-input" value={intNote} onChange={e => setIntNote(e.target.value)} placeholder="Location, interviewers…" style={{ fontSize: 11 }} />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={saveInterview} disabled={saving}>
                    {saving ? 'Saving…' : 'Save interview'}
                </button>
            </div>

            {/* Client feedback */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Client feedback note</div>
                {submission.client_feedback && (
                    <div style={{ fontSize: 11, color: 'var(--ink4)', background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '7px 10px', marginBottom: 8, fontStyle: 'italic' }}>
                        "{submission.client_feedback}"
                        <span className={`cbadge ${submission.client_feedback_sentiment === 'positive' ? 'cb-jade' : submission.client_feedback_sentiment === 'negative' ? 'cb-rub' : 'cb-sea'}`} style={{ marginLeft: 6 }}>
                            {submission.client_feedback_sentiment}
                        </span>
                    </div>
                )}
                <textarea className="form-input" rows={2} value={fbText} onChange={e => setFbText(e.target.value)}
                    placeholder="Add client feedback note…" style={{ fontSize: 11, resize: 'vertical', marginBottom: 6 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                    <select className="form-input" value={fbSent} onChange={e => setFbSent(e.target.value)} style={{ fontSize: 11, flex: 1 }}>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={saveFeedback}>Save</button>
                </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => onSubmitToClient(submission)}>Submit to client</button>
                <button className="btn btn-secondary btn-sm">Draft outreach</button>
                <button className="btn btn-secondary btn-sm">Interview questions</button>
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--ruby2)' }} onClick={() => onReject(submission)}>
                    Reject candidate
                </button>
            </div>
        </div>
    )
}
```

---

## RejectionModal Component

```jsx
// Components/kanban/RejectionModal.jsx
import { useState } from 'react'

const REASONS = [
    { value: 'client',       label: 'Client rejected',         desc: 'Client reviewed and passed on this candidate' },
    { value: 'withdrew',     label: 'Candidate withdrew',      desc: 'Candidate pulled out of the process' },
    { value: 'unsuitable',   label: 'Not suitable for role',   desc: "Doesn't meet core requirements" },
    { value: 'compensation', label: 'Compensation mismatch',   desc: "Salary expectations couldn't be aligned" },
]

export default function RejectionModal({ submission, onClose, onConfirm }) {
    const [reason, setReason] = useState('')
    const [note,   setNote]   = useState('')

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: '20px 22px', width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Reject candidate</div>
                    <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>Select a reason — helps track why candidates were removed.</div>

                {REASONS.map(r => (
                    <div key={r.value} onClick={() => setReason(r.value)} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px',
                        borderRadius: 'var(--rsm)', marginBottom: 6, cursor: 'pointer',
                        border: `1px solid ${reason === r.value ? 'var(--ruby2)' : 'var(--wire)'}`,
                        background: reason === r.value ? 'var(--ruby-pale)' : '#fff',
                    }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${reason === r.value ? 'var(--ruby2)' : 'var(--wire2)'}`, marginTop: 2, flexShrink: 0, background: reason === r.value ? 'var(--ruby2)' : 'transparent' }} />
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: reason === r.value ? 'var(--ruby)' : 'var(--ink)' }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{r.desc}</div>
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 5 }}>Additional note (optional)</div>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Add context for future reference…"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', resize: 'vertical', minHeight: 56, outline: 'none', fontFamily: 'var(--font)' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => { if (!reason) return; onConfirm({ type: reason, note }) }}
                        disabled={!reason}
                        style={{ flex: 1, padding: 9, borderRadius: 'var(--rsm)', background: reason ? 'var(--ruby2)' : 'var(--mist4)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: reason ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
                        Confirm rejection
                    </button>
                    <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 'var(--rsm)', background: 'transparent', border: '1px solid var(--wire2)', color: 'var(--ink4)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
```

---

## AddCandidateModal Component

```jsx
// Components/kanban/AddCandidateModal.jsx
import { useState } from 'react'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function AddCandidateModal({ mandateId, onClose, onSuccess }) {
    const [form, setForm]     = useState({ first_name:'', last_name:'', email:'', linkedin_url:'', current_role:'', current_company:'', initial_stage:'sourced' })
    const [cvFile, setCvFile] = useState(null)
    const [loading, setLoading] = useState(false)

    function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

    function handleSubmit() {
        if (!form.first_name || !form.last_name) return
        setLoading(true)
        const fd = new FormData()
        Object.entries(form).forEach(([k,v]) => fd.append(k, v))
        fd.append('mandate_id', mandateId)
        if (cvFile) fd.append('cv', cvFile)

        fetch(route('recruiter.kanban.add-candidate'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf() },
            body: fd,
        })
        .then(r => r.json())
        .then(d => { if (d.success) onSuccess(d.submission) })
        .finally(() => setLoading(false))
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: '20px 22px', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Add candidate to pipeline</div>
                    <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group">
                        <label className="form-label">First name *</label>
                        <input className="form-input" value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="Sarah" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last name *</label>
                        <input className="form-input" value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Wong" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group">
                        <label className="form-label">Current role</label>
                        <input className="form-input" value={form.current_role} onChange={e => f('current_role', e.target.value)} placeholder="CHRO" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <input className="form-input" value={form.current_company} onChange={e => f('current_company', e.target.value)} placeholder="OCBC Bank" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">LinkedIn</label>
                    <input className="form-input" value={form.linkedin_url} onChange={e => f('linkedin_url', e.target.value)} placeholder="linkedin.com/in/…" />
                </div>
                <div className="form-group">
                    <label className="form-label">Initial stage</label>
                    <select className="form-input" value={form.initial_stage} onChange={e => f('initial_stage', e.target.value)}>
                        <option value="sourced">Sourced</option>
                        <option value="screened">Screened</option>
                    </select>
                </div>

                {/* CV upload */}
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--mist2)', border: `1.5px dashed ${cvFile ? 'var(--jade2)' : 'var(--wire2)'}`, borderRadius: 'var(--rsm)', padding: '12px 14px', cursor: 'pointer', marginBottom: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{cvFile ? cvFile.name : 'Upload CV (PDF or DOCX)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Claude will auto-parse &amp; score against role requirements</div>
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files[0])} />
                </label>

                {/* AI note */}
                <div style={{ background: 'var(--violet-pale)', border: '1px solid var(--violet-soft)', borderRadius: 'var(--rsm)', padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--violet2)' }}>
                    ✦ After adding: Claude reads the CV, extracts profile data, and scores against role requirements automatically.
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !form.first_name || !form.last_name}>
                        {loading ? 'Adding…' : 'Add candidate & run AI analysis'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
```

---

## Kanban CSS (add to app.css)

```css
/* Kanban specific */
.kanban-board {
    display: grid;
    gap: 8px;
    height: 100%;
    overflow-x: auto;
    padding: 14px 16px;
}

.kcard {
    background: #fff;
    border: 1px solid var(--wire);
    border-radius: var(--rsm);
    padding: 8px 10px;
    cursor: grab;
    position: relative;
    overflow: hidden;
    user-select: none;
    transition: box-shadow .15s;
}
.kcard:active { cursor: grabbing; }

.kcard.rejected {
    border-style: dashed;
    opacity: .65;
}

.kcard-accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
}

/* Side panel */
.side-panel {
    width: 310px;
    background: #fff;
    border-left: 1px solid var(--wire);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    transition: width .2s ease;
}

.side-panel.closed { width: 0; overflow: hidden; }
```
