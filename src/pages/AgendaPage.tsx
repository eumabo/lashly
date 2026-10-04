import { useMemo, useState } from 'react'
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MessageCircle, UserX, WalletCards, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useData } from '../lib/data'
import { money, todayISO, whatsappUrl } from '../lib/utils'
import type { Appointment, AppointmentStatus, PaymentMethod } from '../types'

const statuses: {value:'todos'|AppointmentStatus,label:string}[] = [
  {value:'todos',label:'Todos'}, {value:'agendado',label:'Agendados'}, {value:'confirmado',label:'Confirmados'}, {value:'concluido',label:'Concluídos'}, {value:'cancelado',label:'Cancelados'},
]
const methods: PaymentMethod[] = ['Pix','Dinheiro','Crédito','Débito','Outro']

function statusLabel(status: AppointmentStatus) {
  const labels: Record<AppointmentStatus,string> = {
    agendado:'Agendado', confirmado:'Confirmado', concluido:'Concluído', cancelado:'Cancelado', nao_compareceu:'Faltou',
  }
  return labels[status]
}

function initials(name?: string) {
  return (name || 'Cliente').split(' ').filter(Boolean).map(p=>p[0]).slice(0,2).join('').toUpperCase()
}

export default function AgendaPage() {
  const { data, updateAppointment, addPayment } = useData()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [filter, setFilter] = useState<'todos'|AppointmentStatus>('todos')
  const [selected, setSelected] = useState<Appointment|null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Pix')
  const [busy, setBusy] = useState(false)
  const dateObj = parseISO(selectedDate)
  const weekStart = startOfWeek(dateObj,{weekStartsOn:1})
  const week = Array.from({length:7},(_,i)=>addDays(weekStart,i))

  const list = useMemo(()=>data.appointments.filter(a=>a.date===selectedDate && (filter==='todos'||a.appointment_status===filter)).sort((a,b)=>a.start_time.localeCompare(b.start_time)),[data.appointments,selectedDate,filter])
  const allDay = useMemo(()=>data.appointments.filter(a=>a.date===selectedDate),[data.appointments,selectedDate])
  const activeDay = allDay.filter(a=>a.appointment_status!=='cancelado')
  const completedDay = allDay.filter(a=>a.appointment_status==='concluido').length
  const noShowDay = allDay.filter(a=>a.appointment_status==='nao_compareceu').length
  const expectedDay = activeDay.reduce((sum,a)=>sum+a.price,0)

  const paidFor = (appointmentId:string) => data.payments.filter(p=>p.appointment_id===appointmentId).reduce((s,p)=>s+p.amount,0)
  const selectedClient = selected ? data.clients.find(c=>c.id===selected.client_id) : null
  const selectedService = selected ? data.services.find(s=>s.id===selected.service_id) : null
  const paid = selected ? paidFor(selected.id) : 0
  const remaining = selected ? Math.max(0, selected.price-paid) : 0

  async function setStatus(status: AppointmentStatus) {
    if (!selected) return
    setBusy(true)
    try { await updateAppointment(selected.id,{appointment_status:status}); setSelected({...selected,appointment_status:status}) } finally { setBusy(false) }
  }
  async function setReminder(minutes: number) {
    if (!selected) return
    setBusy(true)
    try {
      const value = { reminder_enabled: minutes > 0, reminder_minutes: minutes || 60 }
      await updateAppointment(selected.id, value)
      setSelected({ ...selected, ...value })
    } finally { setBusy(false) }
  }

  async function registerPayment(e:React.FormEvent) {
    e.preventDefault(); if(!selected) return
    const amount=Number(payAmount)
    if(amount<=0||amount>remaining) return
    setBusy(true)
    try { await addPayment({appointment_id:selected.id,amount,payment_method:payMethod,paid_at:new Date().toISOString(),notes:''}); setPayAmount('') } finally { setBusy(false) }
  }

  return <div className="page">
    <PageHeader title="Agenda" subtitle={format(dateObj,"MMMM 'de' yyyy",{locale:ptBR})} />

    <div className="agenda-toolbar-card"><div className="week-toolbar"><button className="icon-btn" onClick={()=>setSelectedDate(format(subDays(dateObj,7),'yyyy-MM-dd'))}><ChevronLeft/></button><input className="date-compact" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/><button className="icon-btn" onClick={()=>setSelectedDate(format(addDays(dateObj,7),'yyyy-MM-dd'))}><ChevronRight/></button></div>
    <div className="day-strip">{week.map(day=>{const iso=format(day,'yyyy-MM-dd');const active=iso===selectedDate;return <button key={iso} className={active?'active':''} onClick={()=>setSelectedDate(iso)}><small>{format(day,'EEE',{locale:ptBR}).replace('.','')}</small><b>{format(day,'dd')}</b></button>})}</div></div>

    <section className="agenda-summary-grid">
      <div className="agenda-summary gold"><span>Na agenda</span><strong>{activeDay.length}</strong><small>{money(expectedDay)} previstos</small></div>
      <div className="agenda-summary green"><span>Concluídos</span><strong>{completedDay}</strong><small>atendimentos finalizados</small></div>
      <div className="agenda-summary red"><span>Faltas</span><strong>{noShowDay}</strong><small>{noShowDay ? 'registrada(s) no dia' : 'nenhuma falta'}</small></div>
      <div className="agenda-summary neutral"><span>Horários</span><strong>{activeDay.length}</strong><small>reservados neste dia</small></div>
    </section>

    <div className="chip-row">{statuses.map(s=><button key={s.value} className={`chip ${filter===s.value?'active':''}`} onClick={()=>setFilter(s.value)}>{s.label}</button>)}</div>

    <section className="section-block agenda-block premium-panel">
      <div className="section-title"><div><span className="eyebrow">{format(dateObj,'EEEE',{locale:ptBR})}</span><h2>{list.length} atendimento(s)</h2></div></div>
      {list.length===0?<EmptyState icon={CalendarDays} title="Sua agenda está livre" text="Use o botão + para criar um novo agendamento."/>:<div className="timeline-list refined-timeline">{list.map(a=>{const c=data.clients.find(x=>x.id===a.client_id);const s=data.services.find(x=>x.id===a.service_id);return <button className="timeline-card refined" key={a.id} onClick={()=>setSelected(a)}><div className="timeline-time"><b>{a.start_time}</b><span>{a.end_time}</span></div><div className="client-avatar small-avatar">{initials(c?.name)}</div><div className="timeline-content"><div className="timeline-top"><b>{c?.name||'Cliente'}</b><span className={`status-badge ${a.appointment_status}`}>{statusLabel(a.appointment_status)}</span></div><span>{s?.name||'Serviço'} · {money(a.price)}</span></div></button>})}</div>}
    </section>

    {selected && <div className="sheet-backdrop" onMouseDown={()=>setSelected(null)}><section className="sheet details-sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-head"><div><span className="eyebrow">Atendimento</span><h2>{selectedClient?.name}</h2></div><button className="icon-btn" onClick={()=>setSelected(null)}><X/></button></div>
      <div className="detail-grid"><div><span>Serviço</span><b>{selectedService?.name}</b></div><div><span>Horário</span><b>{selected.start_time} – {selected.end_time}</b></div><div><span>Valor</span><b>{money(selected.price)}</b></div><div><span>Recebido</span><b>{money(paid)}</b></div></div>
      <label className="reminder-inline"><span><Bell/> Lembrete no celular</span><select disabled={busy} value={selected.reminder_enabled===false?'0':String(selected.reminder_minutes||60)} onChange={e=>setReminder(Number(e.target.value))}><option value="0">Sem lembrete</option><option value="15">15 min antes</option><option value="30">30 min antes</option><option value="60">1 hora antes</option><option value="120">2 horas antes</option><option value="1440">1 dia antes</option></select></label>
      <div className="action-row wrap">
        {selected.appointment_status==='agendado'&&<button className="soft-btn" disabled={busy} onClick={()=>setStatus('confirmado')}><CheckCircle2/> Confirmar</button>}
        {!['concluido','cancelado','nao_compareceu'].includes(selected.appointment_status)&&<button className="soft-btn" disabled={busy} onClick={()=>setStatus('concluido')}><CheckCircle2/> Concluir</button>}
        {!['concluido','cancelado','nao_compareceu'].includes(selected.appointment_status)&&<button className="soft-btn danger-soft" disabled={busy} onClick={()=>confirm('Marcar como não compareceu?')&&setStatus('nao_compareceu')}><UserX/> Não compareceu</button>}
        {selectedClient?.phone&&<a className="soft-btn" target="_blank" rel="noreferrer" href={whatsappUrl(selectedClient.phone)}><MessageCircle/> WhatsApp</a>}
      </div>
      {remaining>0 && selected.appointment_status!=='cancelado' && <form className="payment-box" onSubmit={registerPayment}><div><span className="eyebrow">Falta receber</span><strong>{money(remaining)}</strong></div><div className="form-row"><label>Receber agora<input type="number" min="0.01" max={remaining} step="0.01" value={payAmount} onChange={e=>setPayAmount(e.target.value)} required/></label><label>Forma<select value={payMethod} onChange={e=>setPayMethod(e.target.value as PaymentMethod)}>{methods.map(m=><option key={m}>{m}</option>)}</select></label></div><button className="primary-btn" disabled={busy}><WalletCards/> Registrar pagamento</button></form>}
    </section></div>}
  </div>
}
