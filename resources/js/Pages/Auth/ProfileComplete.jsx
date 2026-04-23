import { useForm } from '@inertiajs/react'

const GROUPS = ['Dwikar', 'Emma', 'BTI', 'Jiebei']

export default function ProfileComplete({ user }) {
    const { data, setData, post, processing, errors } = useForm({
        recruiter_group: '',
        phone: '',
        linkedin_url: '',
    })

    function submit(e) {
        e.preventDefault()
        post(route('profile.update'))
    }

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font)', padding: 20,
        }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: '#fff' }}>
                        Sea<span style={{ color: 'var(--sea3)' }}>Search</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>Complete your recruiter profile</div>
                </div>

                <div style={{ background: 'var(--ink2)', border: '1px solid var(--ink3)', borderRadius: 'var(--r)', padding: '28px 28px' }}>

                    {/* User info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--ink)', borderRadius: 'var(--rsm)', marginBottom: 24 }}>
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                        ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 500 }}>
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{user?.name}</div>
                            <div style={{ fontSize: 12, color: '#888780' }}>{user?.email}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(53,137,212,0.15)', color: 'var(--sea3)', border: '1px solid rgba(53,137,212,0.3)' }}>
                            Recruiter
                        </span>
                    </div>

                    <form onSubmit={submit}>
                        {/* Group picker */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: '#C8C4BC', marginBottom: 10, fontWeight: 500 }}>
                                Select your recruiter group <span style={{ color: 'var(--ruby2)' }}>*</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {GROUPS.map(g => (
                                    <div
                                        key={g}
                                        onClick={() => setData('recruiter_group', g)}
                                        style={{
                                            padding: '12px 16px', borderRadius: 'var(--rsm)', cursor: 'pointer',
                                            border: `1px solid ${data.recruiter_group === g ? 'var(--sea2)' : 'var(--ink3)'}`,
                                            background: data.recruiter_group === g ? 'rgba(26,109,181,0.15)' : 'var(--ink)',
                                            color: data.recruiter_group === g ? 'var(--sea3)' : '#888780',
                                            fontSize: 13, fontWeight: data.recruiter_group === g ? 500 : 400,
                                            transition: 'all .15s',
                                        }}
                                    >
                                        {g}
                                    </div>
                                ))}
                            </div>
                            {errors.recruiter_group && <div style={{ fontSize: 11, color: 'var(--ruby2)', marginTop: 5 }}>{errors.recruiter_group}</div>}
                        </div>

                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ color: '#C8C4BC' }}>Phone number</label>
                            <input
                                className="form-input"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="+65 9xxx xxxx"
                                style={{ background: 'var(--ink)', borderColor: 'var(--ink3)', color: '#fff' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label" style={{ color: '#C8C4BC' }}>LinkedIn profile</label>
                            <input
                                className="form-input"
                                value={data.linkedin_url}
                                onChange={e => setData('linkedin_url', e.target.value)}
                                placeholder="linkedin.com/in/…"
                                style={{ background: 'var(--ink)', borderColor: 'var(--ink3)', color: '#fff' }}
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={processing || !data.recruiter_group}
                            style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                        >
                            {processing ? 'Saving…' : 'Complete profile & go to dashboard'}
                        </button>

                        <a href={route('profile.skip')} style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#555350', textDecoration: 'none' }}>
                            Skip for now
                        </a>
                    </form>
                </div>
            </div>
        </div>
    )
}
