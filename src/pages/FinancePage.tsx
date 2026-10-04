import { useMemo, useState } from 'react'
import { addMonths, format, isSameMonth, parseISO, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CircleDollarSign, Pencil, ReceiptText, Trash2, TrendingDown, TrendingUp, WalletCards, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useData } from '../lib/data'
import { dateBR, money } from '../lib/utils'
import type { PaymentMethod } from '../types'

type Movement={id:string;type:'payment'|'income'|'expense';description:string;amount:number;date:string;meta:string}
const methods:PaymentMethod[]=['Pix','Dinheiro','Crédito','Débito','Outro']

export default function FinancePage(){
  const {data,updateExpense,deleteExpense,updateIncome,deleteIncome,updatePayment,deletePayment}=useData()
  const [month,setMonth]=useState(new Date()); const [selected,setSelected]=useState<Movement|null>(null); const [editDescription,setEditDescription]=useState(''); const [editAmount,setEditAmount]=useState(''); const [editDate,setEditDate]=useState(''); const [editMethod,setEditMethod]=useState<PaymentMethod>('Pix'); const [editCategory,setEditCategory]=useState('Outros'); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('')
  const payments=data.payments.filter(p=>isSameMonth(parseISO(p.paid_at),month)); const incomes=data.incomes.filter(i=>isSameMonth(parseISO(i.date),month)); const expenses=data.expenses.filter(e=>isSameMonth(parseISO(e.date),month)); const received=payments.reduce((s,p)=>s+p.amount,0)+incomes.reduce((s,i)=>s+i.amount,0); const spent=expenses.reduce((s,e)=>s+e.amount,0); const profit=received-spent
  const paidByAppointment=new Map<string,number>(); data.payments.forEach(p=>paidByAppointment.set(p.appointment_id,(paidByAppointment.get(p.appointment_id)||0)+p.amount)); const pending=data.appointments.filter(a=>isSameMonth(parseISO(a.date),month)&&!['cancelado','nao_compareceu'].includes(a.appointment_status)).reduce((s,a)=>s+Math.max(0,a.price-(paidByAppointment.get(a.id)||0)),0)
  const movements=useMemo<Movement[]>(()=>[
    ...payments.map(p=>{const a=data.appointments.find(x=>x.id===p.appointment_id);const c=a?data.clients.find(x=>x.id===a.client_id):null;const s=a?data.services.find(x=>x.id===a.service_id):null;return{id:p.id,type:'payment' as const,description:s?.name||'Pagamento de atendimento',amount:p.amount,date:p.paid_at.slice(0,10),meta:c?.name||p.payment_method}}),
    ...incomes.map(i=>({id:i.id,type:'income' as const,description:i.description,amount:i.amount,date:i.date,meta:i.payment_method})),
    ...expenses.map(e=>({id:e.id,type:'expense' as const,description:e.description,amount:-e.amount,date:e.date,meta:e.category})),
  ].sort((a,b)=>b.date.localeCompare(a.date)),[payments,incomes,expenses,data.appointments,data.clients,data.services])

  function openMovement(m:Movement){
    setSelected(m);setMessage('')
    if(m.type==='payment'){const p=data.payments.find(x=>x.id===m.id)!;setEditDescription(m.description);setEditAmount(String(p.amount));setEditDate(p.paid_at.slice(0,10));setEditMethod(p.payment_method);setEditCategory('')}
    if(m.type==='income'){const i=data.incomes.find(x=>x.id===m.id)!;setEditDescription(i.description);setEditAmount(String(i.amount));setEditDate(i.date);setEditMethod(i.payment_method);setEditCategory('')}
    if(m.type==='expense'){const e=data.expenses.find(x=>x.id===m.id)!;setEditDescription(e.description);setEditAmount(String(e.amount));setEditDate(e.date);setEditMethod('Pix');setEditCategory(e.category)}
  }
  async function save(e:React.FormEvent){e.preventDefault();if(!selected)return;setBusy(true);setMessage('');try{
    if(selected.type==='payment') await updatePayment(selected.id,{amount:Number(editAmount),payment_method:editMethod,paid_at:`${editDate}T12:00:00.000Z`})
    if(selected.type==='income') await updateIncome(selected.id,{description:editDescription.trim(),amount:Number(editAmount),date:editDate,payment_method:editMethod})
    if(selected.type==='expense') await updateExpense(selected.id,{description:editDescription.trim(),amount:Number(editAmount),date:editDate,category:editCategory})
    setSelected(null)
  }catch(err:any){setMessage(err?.message||'Não foi possível salvar a alteração.')}finally{setBusy(false)}}
  async function remove(){if(!selected)return;if(!confirm(`Excluir "${selected.description}"?`))return;setBusy(true);setMessage('');try{if(selected.type==='payment')await deletePayment(selected.id);if(selected.type==='income')await deleteIncome(selected.id);if(selected.type==='expense')await deleteExpense(selected.id);setSelected(null)}catch(err:any){setMessage(err?.message||'Não foi possível excluir.')}finally{setBusy(false)}}

  return <div className="page"><PageHeader title="Financeiro" subtitle={format(month,"MMMM 'de' yyyy",{locale:ptBR})}/><div className="month-switch"><button className="icon-btn" onClick={()=>setMonth(subMonths(month,1))}><ChevronLeft/></button><b>{format(month,'MMMM yyyy',{locale:ptBR})}</b><button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></button></div><section className="stats-grid"><div className="stat-card"><span><TrendingUp/> Receitas</span><strong>{money(received)}</strong></div><div className="stat-card"><span><TrendingDown/> Despesas</span><strong>{money(spent)}</strong></div><div className="stat-card profit"><span><CircleDollarSign/> Lucro</span><strong>{money(profit)}</strong></div><div className="stat-card"><span><WalletCards/> Pendente</span><strong>{money(pending)}</strong></div></section><section className="section-block"><div className="section-title"><div><span className="eyebrow">Extrato</span><h2>Movimentações</h2></div><small className="tap-hint"><Pencil/> toque para editar</small></div>{movements.length===0?<EmptyState icon={ReceiptText} title="Nenhuma movimentação" text="Receitas, pagamentos e despesas aparecerão aqui."/>:<div className="movement-list">{movements.map(m=><button className="movement-row" key={`${m.type}-${m.id}`} onClick={()=>openMovement(m)}><div className={`movement-icon ${m.type}`}>{m.type==='expense'?<TrendingDown/>:m.type==='payment'?<WalletCards/>:<TrendingUp/>}</div><div className="movement-main"><b>{m.description}</b><span>{m.meta} · {dateBR(m.date)}</span></div><strong className={m.amount<0?'negative':'positive'}>{m.amount<0?'- ':'+ '}{money(Math.abs(m.amount))}</strong></button>)}</div>}</section>

  {selected&&<div className="sheet-backdrop" onMouseDown={()=>setSelected(null)}><section className="sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-head"><div><span className="eyebrow">{selected.type==='expense'?'Despesa':selected.type==='income'?'Receita':'Pagamento'}</span><h2>Editar movimentação</h2></div><button className="icon-btn" onClick={()=>setSelected(null)}><X/></button></div><form className="form-stack" onSubmit={save}>{selected.type!=='payment'&&<label>Descrição<input required value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label>}{selected.type==='payment'&&<div className="readonly-card"><span>Atendimento</span><b>{selected.description}</b><small>{selected.meta}</small></div>}<div className="form-row"><label>Valor<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={editAmount} onChange={e=>setEditAmount(e.target.value)}/></label><label>Data<input required type="date" value={editDate} onChange={e=>setEditDate(e.target.value)}/></label></div>{selected.type==='expense'?<label>Categoria<select value={editCategory} onChange={e=>setEditCategory(e.target.value)}><option>Materiais</option><option>Produtos</option><option>Equipamentos</option><option>Marketing</option><option>Taxas</option><option>Aluguel</option><option>Outros</option></select></label>:<label>Forma de pagamento<select value={editMethod} onChange={e=>setEditMethod(e.target.value as PaymentMethod)}>{methods.map(m=><option key={m}>{m}</option>)}</select></label>}{message&&<div className="error-banner">{message}</div>}<div className="sticky-sheet-actions"><button className="primary-btn" disabled={busy}>Salvar alteração</button><button type="button" className="danger-btn compact-danger" disabled={busy} onClick={remove}><Trash2/> Excluir</button></div></form></section></div>}
  </div>
}
