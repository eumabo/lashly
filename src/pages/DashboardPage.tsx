import { CalendarDays, CircleDollarSign, Clock3, ReceiptText, Settings, Sparkles, TrendingUp, Users, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, isSameMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import { money, nowTime, todayISO } from '../lib/utils'

function greetingFor(hour: number) {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function statusLabel(status: string) {
  const labels: Record<string,string> = {
    agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado', nao_compareceu: 'Faltou',
  }
  return labels[status] || status
}

export default function DashboardPage() {
  const { data, loading, error } = useData()
  const { profileName } = useAuth()
  const now = new Date()
  const today = todayISO()
  const receivedThisMonth = data.payments.filter(p => isSameMonth(parseISO(p.paid_at), now)).reduce((s,p)=>s+p.amount,0)
    + data.incomes.filter(i => isSameMonth(parseISO(i.date), now)).reduce((s,i)=>s+i.amount,0)
  const expensesThisMonth = data.expenses.filter(e => isSameMonth(parseISO(e.date), now)).reduce((s,e)=>s+e.amount,0)
  const profit = receivedThisMonth - expensesThisMonth
  const todayReceived = data.payments.filter(p => p.paid_at.startsWith(today)).reduce((s,p)=>s+p.amount,0) + data.incomes.filter(i=>i.date===today).reduce((s,i)=>s+i.amount,0)

  const paidByAppointment = new Map<string, number>()
  data.payments.forEach(p => paidByAppointment.set(p.appointment_id, (paidByAppointment.get(p.appointment_id)||0)+p.amount))
  const pending = data.appointments.filter(a=>!['cancelado','nao_compareceu'].includes(a.appointment_status)).reduce((sum,a)=>sum+Math.max(0,a.price-(paidByAppointment.get(a.id)||0)),0)

  const todayAppointments = data.appointments.filter(a=>a.date===today && a.appointment_status!=='cancelado').sort((a,b)=>a.start_time.localeCompare(b.start_time))
  const next = todayAppointments.find(a=>a.start_time>=nowTime() && !['concluido','nao_compareceu'].includes(a.appointment_status))
  const client = next ? data.clients.find(c=>c.id===next.client_id) : null
  const service = next ? data.services.find(s=>s.id===next.service_id) : null

  return <div className="page dashboard-page">
    <PageHeader title={`${greetingFor(now.getHours())}, ${profileName}`} subtitle={format(now, "EEEE, dd 'de' MMMM", {locale:ptBR})} action={<Link to="/configuracoes" className="icon-btn mobile-only"><Settings/></Link>} />
    {error && <div className="error-banner">{error}</div>}

    <section className="dashboard-metrics">
      <article className="metric-card featured">
        <div className="metric-icon"><TrendingUp/></div>
        <span>Faturamento do mês</span>
        <strong>{money(receivedThisMonth)}</strong>
        <small>{money(todayReceived)} recebido hoje</small>
      </article>
      <article className="metric-card">
        <div className="metric-icon"><CalendarDays/></div>
        <span>Agenda hoje</span>
        <strong>{todayAppointments.length}</strong>
        <small>{todayAppointments.length === 1 ? 'cliente agendada' : 'clientes agendadas'}</small>
      </article>
      <article className="metric-card success">
        <div className="metric-icon"><CircleDollarSign/></div>
        <span>Lucro do mês</span>
        <strong>{money(profit)}</strong>
        <small>{money(expensesThisMonth)} em despesas</small>
      </article>
      <article className={`metric-card ${pending > 0 ? 'attention' : ''}`}>
        <div className="metric-icon"><WalletCards/></div>
        <span>A receber</span>
        <strong>{money(pending)}</strong>
        <small>valores ainda pendentes</small>
      </article>
    </section>

    <section className="dashboard-columns">
      <article className="premium-panel next-panel">
        <div className="panel-heading"><div><span className="eyebrow">Próximo atendimento</span><h2>{next ? next.start_time : 'Agenda tranquila'}</h2></div><div className="round-icon"><Clock3/></div></div>
        {loading ? <div className="skeleton line"/> : next ? <div className="next-client-card">
          <div className="client-avatar">{client?.name?.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || 'CL'}</div>
          <div className="next-client-info"><b>{client?.name || 'Cliente'}</b><span>{service?.name || 'Atendimento'} · {money(next.price)}</span></div>
          <span className={`status-badge ${next.appointment_status}`}>{statusLabel(next.appointment_status)}</span>
        </div> : <div className="calm-state"><Sparkles/><div><b>Nenhum atendimento próximo</b><span>O próximo horário aparecerá aqui.</span></div></div>}
      </article>

      <article className="premium-panel agenda-preview-panel">
        <div className="panel-heading"><div><span className="eyebrow">Hoje</span><h2>Agenda do dia</h2></div><Link to="/agenda" className="panel-link">Ver agenda</Link></div>
        {todayAppointments.length===0 ? <EmptyState icon={CalendarDays} title="Nenhum atendimento hoje" text="Sua agenda está livre por enquanto."/> : <div className="appointment-list refined-list">
          {todayAppointments.slice(0,5).map(a=>{
            const c=data.clients.find(x=>x.id===a.client_id); const s=data.services.find(x=>x.id===a.service_id)
            const initials=c?.name?.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || 'CL'
            return <Link to="/agenda" key={a.id} className="appointment-row refined"><div className="time-column"><b>{a.start_time}</b><span>{a.end_time}</span></div><div className="client-avatar small-avatar">{initials}</div><div className="appointment-main"><b>{c?.name||'Cliente'}</b><span>{s?.name||'Serviço'} · {money(a.price)}</span></div><span className={`status-badge ${a.appointment_status}`}>{statusLabel(a.appointment_status)}</span></Link>
          })}
        </div>}
      </article>
    </section>

    <section className="dashboard-footer-stats">
      <div><ReceiptText/><span>Despesas do mês</span><strong>{money(expensesThisMonth)}</strong></div>
      <div><Users/><span>Clientes cadastradas</span><strong>{data.clients.length}</strong></div>
    </section>
  </div>
}
