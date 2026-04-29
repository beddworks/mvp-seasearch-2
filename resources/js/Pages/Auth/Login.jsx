import { useForm, usePage } from '@inertiajs/react'

export default function Login() {
    const { errors } = usePage().props
    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    })

    function submit(e) {
        e.preventDefault()
        post(route('login.post'))
    }

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font)',
        }}>
            <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 48, height: 48, borderRadius: 12, background: 'var(--sea)',
                        fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: '#fff',
                        marginBottom: 12,
                    }}>SS</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                        Sea<span style={{ color: 'var(--sea3)' }}>Search</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#888780' }}>AI-powered executive recruitment · SEA</div>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--ink2)', border: '1px solid var(--ink3)',
                    borderRadius: 'var(--r)', padding: '28px 28px',
                }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Welcome back</div>
                    <div style={{ fontSize: 12, color: '#888780', marginBottom: 20 }}></div>

                    {errors?.email && (
                        <div style={{ background: '#3D1A1A', border: '1px solid var(--ruby2)', borderRadius: 'var(--rsm)', padding: '8px 12px', fontSize: 12, color: '#F88', marginBottom: 14 }}>
                            {errors.email}
                        </div>
                    )}

                    <form onSubmit={submit}>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ color: '#C8C4BC' }}>Email address</label>
                            <input
                                className="form-input"
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                placeholder="your@email.com"
                                autoComplete="email"
                                style={{ background: 'var(--ink)', borderColor: 'var(--ink3)', color: '#fff' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label" style={{ color: '#C8C4BC' }}>Password</label>
                            <input
                                className="form-input"
                                type="password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                autoComplete="current-password"
                                style={{ background: 'var(--ink)', borderColor: 'var(--ink3)', color: '#fff' }}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={processing}
                            style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}
                        >
                            {processing ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--ink3)' }} />
                        <span style={{ fontSize: 11, color: '#888780' }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--ink3)' }} />
                    </div>

                    <a
                        href={route('auth.google')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '9px 16px', borderRadius: 'var(--rsm)',
                            border: '1px solid var(--ink3)', background: 'transparent', color: '#C8C4BC',
                            fontSize: 13, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
                            transition: 'all .15s',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google (Recruiters)
                    </a>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#555350' }}>
                    SeaSearch v2 · Executive Recruitment Platform · SE Asia
                </div>
            </div>
        </div>
    )
}
