export default function Stub({ class: className }) {
    return (
        <div style={{ padding: 40, fontFamily: 'var(--font)', color: 'var(--ink)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🚧 Under Construction</div>
            <div style={{ fontSize: 14, color: 'var(--ink4)' }}>{className} — coming soon</div>
        </div>
    )
}
