import { useMemo, useState } from 'react'
import { CalendarPlus, UserPlus, WalletCards, ReceiptText, X } from 'lucide-react'
import { useData } from '../lib/data'
import { todayISO } from '../lib/utils'
import type { PaymentMethod } from '../types'

type Mode = 'menu' | 'appointment' | 'client' | 'income' | 'expense'

const paymentMethods: PaymentMethod[] = ['Pix', 'Dinheiro', 'Crédito', 'Débito', 'Outro']

function calcEnd(start: string, duration: number) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + duration
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addAppointment, addClient, addIncome, addExpense } = useData()
  const [mode, setMode] = useState<Mode>('menu')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const firstClient = data.clients[0]?.id || ''
  const firstService = data.services.find(s => s.active)?.id || ''

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [apptClient, setApptClient] = useState(firstClient)
  const [apptService, setApptService] = useState(firstService)
  const [apptDate, setApptDate] = useState(todayISO())
  const [apptTime, setApptTime] = useState('09:00')
  const selectedService = useMemo(() => data.services.find(s => s.id === apptService), [data.services, apptService])
  const [customPrice, setCustomPrice] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState('60')

  const [incomeDesc, setIncomeDesc] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>('Pix')

  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Materiais')

  if (!open) return null

  const close = () => { setMode('menu'); setMessage(''); onClose() }
  const finish = (text: string) => { setMessage(text); setTimeout(close, 650) }

  async function submitClient(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try { await addClient({ name: clientName.trim(), phone: clientPhone.trim(), notes: '' }); setClientName(''); setClientPhone(''); finish('Cliente cadastrada ✓') }
    catch (err: any) { setMessage(err?.message || 'Não foi possível cadastrar.') }
    finally { setBusy(false) }
  }

  async function submitAppointment(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      if (!apptClient || !apptService || !selectedService) throw new Error('Cadastre cliente e serviço primeiro.')
      const price = Number(customPrice || selectedService.price)
      await addAppointment({
        client_id: apptClient,
        service_id: apptService,
        date: apptDate,
        start_time: apptTime,
        end_time: calcEnd(apptTime, selectedService.duration_minutes),
        price,
        appointment_status: 'agendado',
        reminder_enabled: reminderMinutes !== '0',
        reminder_minutes: Number(reminderMinutes || 60),
        notes: '',
      })
      finish('Agendamento criado ✓')
    } catch (err: any) { setMessage(err?.message || 'Não foi possível agendar.') }
    finally { setBusy(false) }
  }

  async function submitIncome(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try { await addIncome({ description: incomeDesc.trim(), amount: Number(incomeAmount), date: todayISO(), payment_method: incomeMethod, notes: '' }); setIncomeDesc(''); setIncomeAmount(''); finish('Receita registrada ✓') }
    catch (err: any) { setMessage(err?.message || 'Não foi possível salvar.') }
    finally { setBusy(false) }
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try { await addExpense({ description: expenseDesc.trim(), amount: Number(expenseAmount), category: expenseCategory, date: todayISO(), notes: '' }); setExpenseDesc(''); setExpenseAmount(''); finish('Despesa adicionada ✓') }
    catch (err: any) { setMessage(err?.message || 'Não foi possível salvar.') }
    finally { setBusy(false) }
  }

  return <div className="sheet-backdrop" onMouseDown={close}>
    <section className="sheet" onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-head"><div><span className="eyebrow">Ação rápida</span><h2>{mode === 'menu' ? 'O que você quer adicionar?' : mode === 'appointment' ? 'Novo agendamento' : mode === 'client' ? 'Nova cliente' : mode === 'income' ? 'Nova receita' : 'Nova despesa'}</h2></div><button className="icon-btn" onClick={close}><X/></button></div>

      {mode === 'menu' && <div className="quick-grid">
        <button onClick={() => setMode('appointment')}><CalendarPlus/><span><b>Novo agendamento</b><small>Cliente, serviço e horário</small></span></button>
        <button onClick={() => setMode('client')}><UserPlus/><span><b>Nova cliente</b><small>Cadastro rápido</small></span></button>
        <button onClick={() => setMode('income')}><WalletCards/><span><b>Nova receita</b><small>Entrada avulsa</small></span></button>
        <button onClick={() => setMode('expense')}><ReceiptText/><span><b>Nova despesa</b><small>Material, taxa ou conta</small></span></button>
      </div>}

      {mode === 'client' && <form className="form-stack" onSubmit={submitClient}>
        <label>Nome<input value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Nome da cliente" /></label>
        <label>WhatsApp<input value={clientPhone} onChange={e => setClientPhone(e.target.value)} required inputMode="tel" placeholder="(27) 99999-9999" /></label>
        <button className="primary-btn" disabled={busy}>Cadastrar cliente</button>
      </form>}

      {mode === 'appointment' && <form className="form-stack" onSubmit={submitAppointment}>
        <label>Cliente<select value={apptClient} onChange={e => setApptClient(e.target.value)} required><option value="">Selecione</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Serviço<select value={apptService} onChange={e => { setApptService(e.target.value); setCustomPrice('') }} required><option value="">Selecione</option>{data.services.filter(s=>s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <div className="form-row"><label>Data<input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} required /></label><label>Horário<input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} required /></label></div>
        <label>Valor<input type="number" min="0" step="0.01" inputMode="decimal" value={customPrice || String(selectedService?.price ?? '')} onChange={e => setCustomPrice(e.target.value)} required /></label>
        <label>Lembrete no celular<select value={reminderMinutes} onChange={e => setReminderMinutes(e.target.value)}><option value="0">Sem lembrete</option><option value="15">15 min antes</option><option value="30">30 min antes</option><option value="60">1 hora antes</option><option value="120">2 horas antes</option><option value="1440">1 dia antes</option></select></label>
        <button className="primary-btn" disabled={busy || !data.clients.length || !data.services.length}>Criar agendamento</button>
        {(!data.clients.length || !data.services.length) && <p className="form-hint">Cadastre pelo menos uma cliente e um serviço antes de agendar.</p>}
      </form>}

      {mode === 'income' && <form className="form-stack" onSubmit={submitIncome}>
        <label>Descrição<input value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} required placeholder="Ex.: Venda de produto" /></label>
        <label>Valor<input type="number" min="0.01" step="0.01" inputMode="decimal" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} required /></label>
        <label>Forma de pagamento<select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value as PaymentMethod)}>{paymentMethods.map(m => <option key={m}>{m}</option>)}</select></label>
        <button className="primary-btn" disabled={busy}>Registrar receita</button>
      </form>}

      {mode === 'expense' && <form className="form-stack" onSubmit={submitExpense}>
        <label>Descrição<input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required placeholder="Ex.: Cola e cílios" /></label>
        <label>Valor<input type="number" min="0.01" step="0.01" inputMode="decimal" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required /></label>
        <label>Categoria<select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}><option>Materiais</option><option>Produtos</option><option>Equipamentos</option><option>Marketing</option><option>Taxas</option><option>Aluguel</option><option>Outros</option></select></label>
        <button className="primary-btn" disabled={busy}>Adicionar despesa</button>
      </form>}

      {mode !== 'menu' && <button className="text-btn sheet-back" onClick={() => { setMode('menu'); setMessage('') }}>← Voltar</button>}
      {message && <div className={`sheet-message ${message.includes('✓') ? 'ok' : ''}`}>{message}</div>}
    </section>
  </div>
}
