import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { DateTime } from 'npm:luxon@3.5.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
const ZONE = 'America/Sao_Paulo'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

Deno.serve(async () => {
  try {
    const localNow = DateTime.now().setZone(ZONE)
    const minDate = localNow.minus({ days: 1 }).toISODate()
    const maxDate = localNow.plus({ days: 2 }).toISODate()

    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id,user_id,date,start_time,reminder_enabled,reminder_minutes,appointment_status,clients(name),services(name)')
      .gte('date', minDate)
      .lte('date', maxDate)
      .eq('reminder_enabled', true)
      .in('appointment_status', ['agendado', 'confirmado'])

    if (appointmentError) throw appointmentError

    let sent = 0
    let checked = 0
    const nowMs = Date.now()

    for (const appointment of appointments || []) {
      const appointmentAt = DateTime.fromISO(`${appointment.date}T${String(appointment.start_time).slice(0, 8)}`, { zone: ZONE })
      const reminderAt = appointmentAt.minus({ minutes: appointment.reminder_minutes || 60 })
      const delta = nowMs - reminderAt.toMillis()
      if (delta < 0 || delta > 120_000) continue
      checked += 1

      const { data: existing } = await supabase
        .from('notification_deliveries')
        .select('id')
        .eq('user_id', appointment.user_id)
        .eq('appointment_id', appointment.id)
        .eq('reminder_minutes', appointment.reminder_minutes || 60)
        .maybeSingle()
      if (existing) continue

      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .select('id,endpoint,p256dh,auth')
        .eq('user_id', appointment.user_id)
      if (subscriptionError) throw subscriptionError
      if (!subscriptions?.length) continue

      const clientName = Array.isArray(appointment.clients) ? appointment.clients[0]?.name : appointment.clients?.name
      const serviceName = Array.isArray(appointment.services) ? appointment.services[0]?.name : appointment.services?.name
      const minutes = appointment.reminder_minutes || 60
      const when = minutes >= 1440 ? 'amanhã' : minutes >= 60 ? `em ${Math.round(minutes / 60)}h` : `em ${minutes} min`
      const payload = JSON.stringify({
        title: 'Próximo atendimento',
        body: `${clientName || 'Cliente'} • ${serviceName || 'Atendimento'} ${when} (${String(appointment.start_time).slice(0, 5)})`,
        tag: `appointment-${appointment.id}-${minutes}`,
        url: '/agenda',
      })

      let delivered = false
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, payload)
          delivered = true
          sent += 1
        } catch (error: any) {
          const status = Number(error?.statusCode || 0)
          if (status === 404 || status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
          } else {
            console.error('push error', error)
          }
        }
      }

      if (delivered) {
        await supabase.from('notification_deliveries').insert({
          user_id: appointment.user_id,
          appointment_id: appointment.id,
          reminder_minutes: minutes,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, checked, sent }), { headers: { 'content-type': 'application/json' } })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false, error: error?.message || 'Erro ao enviar lembretes' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
