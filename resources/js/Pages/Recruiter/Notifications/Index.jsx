import React from 'react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { usePage, router } from '@inertiajs/react'
import { fmtRelative } from '@/lib/utils'

const typeIcon = {
    claim_approved:      { icon: '✓', color: 'var(--jade2)' },
    claim_rejected:      { icon: '✗', color: 'var(--ruby2)' },
    submission_approved: { icon: '✓', color: 'var(--jade2)' },
    submission_rejected: { icon: '!', color: 'var(--amber2)' },
    mandate_picked:      { icon: '↑', color: 'var(--sea2)' },
    candidate_added:     { icon: '+', color: 'var(--sea2)' },
    candidate_moved:     { icon: '→', color: 'var(--violet2)' },
    candidate_submitted: { icon: '⊕', color: 'var(--amber2)' },
}

export default function NotificationsIndex({ notifications }) {
    const { auth } = usePage().props

    function markAllRead() {
        router.post(route('notifications.read-all'))
    }

    function handleClick(notif) {
        if (!notif.is_read) {
            router.post(route('notifications.read', notif.id), {}, { preserveScroll: true })
        }
        if (notif.action_url) {
            window.location.href = notif.action_url
        }
    }

    const items = notifications.data ?? []

    return (
        <RecruiterLayout title="Notifications">
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>Notifications</h1>
                    {items.some(n => !n.is_read) && (
                        <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                {items.length === 0 && (
                    <div className="dcard" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink4)' }}>
                        No notifications yet.
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(notif => {
                        const meta = typeIcon[notif.type] ?? { icon: '•', color: 'var(--ink4)' }
                        return (
                            <div
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                style={{
                                    display: 'flex',
                                    gap: 14,
                                    padding: '14px 18px',
                                    background: notif.is_read ? '#fff' : 'var(--sea-pale)',
                                    border: '1px solid var(--wire)',
                                    borderRadius: 'var(--r)',
                                    cursor: notif.action_url ? 'pointer' : 'default',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {/* icon */}
                                <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: meta.color, color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 15, flexShrink: 0,
                                }}>
                                    {meta.icon}
                                </div>

                                {/* content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                                        {notif.title}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 4 }}>
                                        {notif.body}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
                                        {fmtRelative(notif.created_at)}
                                    </div>
                                </div>

                                {!notif.is_read && (
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sea2)', flexShrink: 0, marginTop: 4 }} />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* pagination */}
                {notifications.last_page > 1 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                        {notifications.current_page > 1 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => router.get(notifications.prev_page_url)}>← Prev</button>
                        )}
                        <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--ink4)' }}>
                            {notifications.current_page} / {notifications.last_page}
                        </span>
                        {notifications.current_page < notifications.last_page && (
                            <button className="btn btn-ghost btn-sm" onClick={() => router.get(notifications.next_page_url)}>Next →</button>
                        )}
                    </div>
                )}
            </div>
        </RecruiterLayout>
    )
}
