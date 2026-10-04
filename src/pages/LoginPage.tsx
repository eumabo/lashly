import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const error = await signIn(email, password)
    if (error) setMessage(error === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error)
    setBusy(false)
  }

  async function forgot() {
    if (!email) { setMessage('Digite seu e-mail primeiro.'); return }
    setBusy(true)
    const error = await resetPassword(email)
    setMessage(error || 'Link de recuperação enviado para seu e-mail.')
    setBusy(false)
  }

  return <div className="login-screen">
    <div className="login-card">
      <img className="login-brand-logo" src="/lashly-default-logo.png" alt="Lashly"/>
      <span className="eyebrow">Lashly</span>
      <h1>Seu estúdio, em harmonia.</h1>
      <p>Agenda, clientes e financeiro com a leveza que sua rotina merece.</p>
      <form className="form-stack login-form" onSubmit={submit}>
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seu@email.com" /></label>
        <label>Senha<div className="password-wrap"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
        <button className="primary-btn" disabled={busy}>{busy?<><Loader2 className="spin"/> Entrando…</>:'Entrar'}</button>
        <button type="button" className="text-btn" onClick={forgot}>Esqueci minha senha</button>
      </form>
      {message && <div className="login-message">{message}</div>}
    </div>
  </div>
}
