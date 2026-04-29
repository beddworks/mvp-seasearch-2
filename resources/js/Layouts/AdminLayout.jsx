import { usePage, Link } from '@inertiajs/react'
import { initials } from '@/lib/utils'

const NAV_ITEMS = [
    { icon: '▦', label: 'Dashboard',   route: 'admin.dashboard' },
    { icon: '📋', label: 'Roles',    route: 'admin.mandates.index' },
    { icon: '◉', label: 'Candidates', route: 'admin.candidates.index' },
    { icon: '🏢', label: 'Clients',     route: 'admin.clients.index' },
    { icon: '◎', label: 'Recruiters', route: 'admin.recruiters.index' },
    { icon: '🔑', label: 'Claims Request',     route: 'admin.claims.index' },
    // { icon: '📥', label: 'Submissions', route: 'admin.submissions.index' },
    { icon: '⚙', label: 'Config',     route: 'admin.compensation-types.index' },
    // { icon: '⏱', label: 'Timers',     route: 'admin.timer-config' },
    // { icon: '📊', label: 'Analytics',  route: 'admin.analytics.index' },
]

export default function AdminLayout({ children, breadcrumb = null, noPadding = false }) {
    const { auth, flash } = usePage().props
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
                <a href={route('admin.dashboard')} style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '0 14px', marginBottom: 20, textDecoration: 'none',
                }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8, background: 'var(--ruby2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>SS</div>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>Sea Search</span>
                </a>

                <div style={{ height: 1, background: 'var(--ink2)', margin: '0 14px 8px' }} />

                {NAV_ITEMS.map(item => (
                    <a key={item.route} href={route(item.route)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 14px', margin: '1px 8px', borderRadius: 7,
                        cursor: 'pointer', textDecoration: 'none', position: 'relative',
                        color: isActive(item.route) ? '#fff' : '#9E9C97',
                        background: isActive(item.route) ? 'rgba(255,255,255,0.08)' : 'transparent',
                        transition: 'all .15s',
                    }}>
                        <span style={{ fontSize: 14, flexShrink: 0, width: 18, textAlign: 'center' }}>{item.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: isActive(item.route) ? 600 : 400, whiteSpace: 'nowrap' }}>{item.label}</span>
                        {isActive(item.route) && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: 'var(--ruby2)' }} />}
                    </a>
                ))}

                {/* Bottom: user + logout */}
                <div style={{ marginTop: 'auto', padding: '10px 12px 4px', borderTop: '1px solid var(--ink2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: 'var(--ruby2)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 600, flexShrink: 0, border: '2px solid #7A1A1A',
                        }}>{initials(user?.name ?? 'A')}</div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Admin</div>
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
                        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Admin</span>
                        {Array.isArray(breadcrumb)
                            ? breadcrumb.map((crumb, i) => (
                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: 'var(--wire2)' }}>›</span>
                                    {crumb.href
                                        ? <a href={crumb.href} style={{ color: i === breadcrumb.length - 1 ? 'var(--ink)' : 'var(--ink4)', fontWeight: i === breadcrumb.length - 1 ? 500 : 400, textDecoration: 'none' }}>{crumb.label}</a>
                                        : <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{crumb.label}</span>}
                                </span>
                            ))
                            : breadcrumb && <><span style={{ color: 'var(--wire2)' }}>›</span><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{breadcrumb}</span></>}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--ruby-pale)', color: 'var(--ruby2)', fontWeight: 500, border: '1px solid #F0B8B8' }}>
                            Admin
                        </span>
                    </div>
                </div>

                {flash?.success && <div className="flash-success" style={{ margin: '12px 20px 0' }}>{flash.success}</div>}
                {flash?.error && <div className="flash-error" style={{ margin: '12px 20px 0' }}>{flash.error}</div>}

                <div style={{ flex: 1, overflow: 'hidden', ...(noPadding ? {} : { overflowY: 'auto', padding: 20 }) }}>
                    {children}
                </div>
            </div>
        </div>
    )
}
