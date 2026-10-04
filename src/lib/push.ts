import { supabase } from './supabase'

export type PushSupport = {
  supported: boolean
  isIOS: boolean
  isStandalone: boolean
  permission: NotificationPermission | 'unsupported'
  hasVapidKey: boolean
}

const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()

export function getPushSupport(): PushSupport {
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  return {
    supported,
    isIOS,
    isStandalone,
    permission: supported ? Notification.permission : 'unsupported',
    hasVapidKey: Boolean(vapidPublicKey),
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export async function requestPushPermission(userId?: string | null) {
  const support = getPushSupport()
  if (!support.supported) throw new Error('Este aparelho/navegador não oferece notificações web.')
  if (support.isIOS && !support.isStandalone) {
    throw new Error('No iPhone, adicione o Lashly à Tela de Início antes de ativar as notificações.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('A permissão de notificações não foi concedida.')

  const registration = await navigator.serviceWorker.ready

  if (!vapidPublicKey) {
    return { permission, subscribed: false, reason: 'VAPID_NOT_CONFIGURED' as const }
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  if (supabase && userId) {
    const json = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (error) throw error
  }

  return { permission, subscribed: true, subscription }
}

export async function unsubscribePush(userId?: string | null) {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  if (supabase && userId) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', userId)
  }
}

export async function sendLocalTestNotification() {
  const support = getPushSupport()
  if (!support.supported) throw new Error('Notificações não são suportadas neste aparelho.')
  if (support.isIOS && !support.isStandalone) throw new Error('No iPhone, abra o app instalado pela Tela de Início para testar notificações.')
  if (Notification.permission !== 'granted') throw new Error('Ative as notificações primeiro.')
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Lashly', {
    body: 'Notificação ativada ✨ Seus lembretes podem aparecer aqui.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'lashly-test',
    data: { url: '/agenda' },
  })
}

export async function getCurrentPushSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}
