import { usePage, Link } from '@inertiajs/react'
import { initials } from '@/lib/utils'

const NAV_ITEMS = [
    { key: 'dashboard',  icon: '▦', label: 'Dashboard',         route: 'recruiter.dashboard' },
    { key: 'mandates',   icon: '◫', label: 'Roles',       route: 'recruiter.mandates.index' },
    { key: 'candidates', icon: '◉', label: 'Candidates', route: 'recruiter.candidates.index' },
    // { key: 'earnings',   icon: '◈', label: 'Earnings',           route: 'recruiter.earnings.index' },
]

export default function RecruiterLayout({ children, breadcrumb = null, noPadding = false }) {
    const { auth, unread_notifications, flash } = usePage().props
    const user = auth?.user

    function isActive(routeName) {
        try {
            const url = route(routeName)
            return window.location.pathname.startsWith(new URL(url).pathname)
        } catch {
            return false
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--ink)', overflow: 'hidden' }}>
            {/* Full Sidebar */}
            <nav style={{
                width: 200, flexShrink: 0, background: 'var(--ink)',
                display: 'flex', flexDirection: 'column',
                padding: '12px 0', borderRight: '1px solid var(--ink2)', zIndex: 50,
            }}>
                {/* Logo */}
                <a href={route('recruiter.dashboard')} style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '0 14px', marginBottom: 20, textDecoration: 'none',
                }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8, background: 'var(--sea)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>SS</div>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>Sea Search</span>
                </a>

                <div style={{ height: 1, background: 'var(--ink2)', margin: '0 14px 8px' }} />

                {NAV_ITEMS.map(item => (
                    <NavBtn
                        key={item.key}
                        icon={item.icon}
                        label={item.label}
                        href={route(item.route)}
                        active={isActive(item.route)}
                    />
                ))}

                {/* <div style={{ height: 1, background: 'var(--ink2)', margin: '8px 14px' }} /> */}

                {/* <NavBtn icon="🔔" label="Notifications" href={route('recruiter.notifications.index')} badge={unread_notifications > 0 ? unread_notifications : null} active={isActive('recruiter.notifications.index')} /> */}

                {/* Bottom: user + logout */}
                <div style={{ marginTop: 'auto', padding: '10px 12px 4px', borderTop: '1px solid var(--ink2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: 'var(--sea)',
                            color: '#E8F2FB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 600, flexShrink: 0, border: '2px solid var(--sea2)',
                        }}>{initials(user?.name ?? 'U')}</div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Recruiter</div>
                        </div>
                    </div>
                    <form method="POST" action={route('logout')}>
                        <input type="hidden" name="_token" value={document.querySelector('meta[name=csrf-token]')?.content} />
                        <button type="submit" style={{
                            width: '100%', padding: '6px 0', borderRadius: 6,
                            border: '1px solid var(--ink2)', background: 'transparent',
                            color: 'var(--ink4)', fontSize: 11, fontFamily: 'var(--font)',
                            cursor: 'pointer', textAlign: 'center',
                        }}>Logout</button>
                    </form>
                </div>
            </nav>

            {/* Main content area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--mist2)' }}>
                {/* Topbar */}
                <div style={{
                    height: 52, background: '#fff', borderBottom: '1px solid var(--wire)',
                    display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink4)' }}>
                        <span>Sea Search</span>
                        <span style={{ color: 'var(--wire2)' }}>›</span>
                        {Array.isArray(breadcrumb)
                            ? breadcrumb.map((crumb, i) => (
                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {i > 0 && <span style={{ color: 'var(--wire2)' }}>›</span>}
                                    {crumb.href
                                        ? <a href={crumb.href} style={{ color: i === breadcrumb.length - 1 ? 'var(--ink)' : 'var(--ink4)', fontWeight: i === breadcrumb.length - 1 ? 500 : 400, textDecoration: 'none' }}>{crumb.label}</a>
                                        : <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{crumb.label}</span>
                                    }
                                </span>
                            ))
                            : <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{breadcrumb ?? 'Recruiter'}</span>
                        }
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 6, padding: '0 12px', height: 32, width: 260, marginLeft: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--wire2)' }}>⌕</span>
                        <input type="text" placeholder="Search roles, candidates…" style={{ border: 'none', background: 'transparent', fontSize: 12, fontFamily: 'var(--font)', width: '100%', outline: 'none', color: 'var(--ink)' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--jade-pale)', color: 'var(--jade)', fontWeight: 500, border: '1px solid #B8DFB9' }}>
                            Recruiter
                        </span>
                        <Link href={route('recruiter.mandates.index')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--wire2)', background: 'transparent', color: 'var(--ink4)', textDecoration: 'none' }}>
                            Browse roles
                        </Link>
                    </div>
                </div>

                {/* Flash messages */}
                {flash?.success && (
                    <div className="flash-success" style={{ margin: '12px 20px 0' }}>{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="flash-error" style={{ margin: '12px 20px 0' }}>{flash.error}</div>
                )}

                {/* Page content */}
                <div style={{ flex: 1, overflow: 'hidden', ...(noPadding ? {} : { overflowY: 'auto', padding: 20 }) }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

function NavBtn({ icon, label, href, active = false, badge = null }) {
    return (
        <a href={href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 14px', margin: '1px 8px', borderRadius: 7,
            cursor: 'pointer', textDecoration: 'none', position: 'relative',
            color: active ? '#fff' : '#9E9C97',
            background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
            transition: 'all .15s',
        }}>
            <span style={{ fontSize: 15, flexShrink: 0, width: 18, textAlign: 'center' }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
            {badge != null && (
                <span style={{
                    minWidth: 16, height: 16, borderRadius: 8, background: '#E24B4A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff', fontFamily: 'var(--mono)', padding: '0 4px',
                }}>{badge}</span>
            )}
            {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: 'var(--sea3)' }} />}
        </a>
    )
}
