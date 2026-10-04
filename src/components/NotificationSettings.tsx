import { useEffect, useMemo, useState } from 'react'
import { Bell, BellRing, Check, ExternalLink, Smartphone, TestTube2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getCurrentPushSubscription, getPushSupport, requestPushPermission, sendLocalTestNotification, unsubscribePush } from '../lib/push'

export default function NotificationSettings() {
  const { user, demoMode } = useAuth()
  const [status, setStatus] = useState(getPushSupport())
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setStatus(getPushSupport())
    void getCurrentPushSubscription().then(Boolean).then(setSubscribed).catch(() => undefined)
  }, [])

  const stateLabel = useMemo(() => {
    if (!status.supported) return 'Não disponível neste navegador'
    if (status.isIOS && !status.isStandalone) return 'Instale na Tela de Início do iPhone'
    if (status.permission === 'denied') return 'Bloqueadas no navegador'
    if (subscribed) return 'Ativas neste aparelho'
    if (status.permission === 'granted') return 'Permissão concedida'
    return 'Desativadas'
  }, [status, subscribed])

  async function activate() {
    setBusy(true); setMessage('')
    try {
      const result = await requestPushPermission(user?.id)
      setStatus(getPushSupport())
      setSubscribed(Boolean(result.subscribed))
      if (result.subscribed) setMessage('Notificações ativadas neste aparelho ✓')
      else if (demoMode) setMessage('Permissão ativada. No modo demonstração, use o teste local. Lembretes automáticos exigem o Supabase.')
      else setMessage('Permissão ativada. Falta configurar a VAPID Public Key para receber push com o app fechado.')
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível ativar as notificações.')
    } finally { setBusy(false) }
  }

  async function test() {
    setBusy(true); setMessage('')
    try { await sendLocalTestNotification(); setMessage('Notificação de teste enviada ✓') }
    catch (error: any) { setMessage(error?.message || 'Não foi possível enviar o teste.') }
    finally { setBusy(false) }
  }

  async function disable() {
    setBusy(true); setMessage('')
    try { await unsubscribePush(user?.id); setSubscribed(false); setMessage('Este aparelho não receberá mais push.') }
    catch { setMessage('Não foi possível desativar agora.') }
    finally { setBusy(false) }
  }

  return <section className="notification-panel">
    <div className="notification-title">
      <div className="notification-icon"><BellRing/></div>
      <div><span className="eyebrow">Lembretes</span><h2>Notificações do celular</h2><p>{stateLabel}</p></div>
    </div>

    {status.isIOS && !status.isStandalone && <div className="ios-install-card">
      <Smartphone/>
      <div><b>No iPhone tem um passo extra</b><p>Abra no Safari, toque em Compartilhar → <strong>Adicionar à Tela de Início</strong>. Depois abra o Lashly pelo ícone e volte aqui para ativar.</p></div>
    </div>}

    {!status.hasVapidKey && !demoMode && <div className="notification-note"><ExternalLink/><span>O app já está preparado para push. Para receber lembretes com o app fechado, configure <code>VITE_VAPID_PUBLIC_KEY</code> e os segredos da Edge Function.</span></div>}

    <div className="notification-actions">
      {!subscribed ? <button className="primary-btn" disabled={busy || !status.supported || (status.isIOS && !status.isStandalone)} onClick={activate}><Bell/> Ativar notificações</button>
      : <button className="soft-btn" disabled={busy} onClick={disable}><Check/> Notificações ativas</button>}
      <button className="soft-btn" disabled={busy || status.permission !== 'granted'} onClick={test}><TestTube2/> Enviar teste</button>
    </div>
    {message && <div className={`sheet-message ${message.includes('✓') ? 'ok' : ''}`}>{message}</div>}
  </section>
}
