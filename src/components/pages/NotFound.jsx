import { useNavigate } from 'react-router-dom'
export default function NotFound() {
  const nav = useNavigate()
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'60vh', gap:16, textAlign:'center' }}>
      <div style={{ fontSize:64 }}>☀</div>
      <div style={{ fontSize:22, fontWeight:700 }}>Page Not Found</div>
      <div style={{ fontSize:13, color:'var(--text2)' }}>
        The page you're looking for doesn't exist.
      </div>
      <button className="btn btn-primary" onClick={() => nav('/')}>
        Back to Dashboard
      </button>
    </div>
  )
}
