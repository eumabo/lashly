import { useMemo, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useData } from '../lib/data'
import { money } from '../lib/utils'

export default function ClientsPage(){
  const {data,addClient}=useData(); const [query,setQuery]=useState(''); const [open,setOpen]=useState(false); const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [busy,setBusy]=useState(false)
  const list=useMemo(()=>data.clients.filter(c=>(c.name+c.phone).toLowerCase().includes(query.toLowerCase())),[data.clients,query])
  const totalSpent=(id:string)=>{const appts=data.appointments.filter(a=>a.client_id===id).map(a=>a.id);return data.payments.filter(p=>appts.includes(p.appointment_id)).reduce((s,p)=>s+p.amount,0)}
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{await addClient({name:name.trim(),phone:phone.trim(),notes:''});setOpen(false);setName('');setPhone('')}finally{setBusy(false)}}
  return <div className="page"><PageHeader title="Clientes" subtitle={`${data.clients.length} cadastrada(s)`} action={<button className="icon-btn" onClick={()=>setOpen(true)}><UserPlus/></button>}/><div className="search-box"><Search/><input placeholder="Buscar por nome ou telefone" value={query} onChange={e=>setQuery(e.target.value)}/></div>{list.length===0?<EmptyState icon={Users} title="Nenhuma cliente encontrada" text="Cadastre uma cliente para começar." action={<button className="primary-btn inline" onClick={()=>setOpen(true)}>Cadastrar cliente</button>}/>:<div className="client-list">{list.map(c=><Link to={`/clientes/${c.id}`} key={c.id} className="client-card"><div className="avatar">{c.name.slice(0,1).toUpperCase()}</div><div className="client-main"><b>{c.name}</b><span>{c.phone||'Sem telefone'}</span></div><div className="client-value"><small>Total</small><b>{money(totalSpent(c.id))}</b></div></Link>)}</div>}
  {open&&<div className="sheet-backdrop" onMouseDown={()=>setOpen(false)}><section className="sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-head"><div><span className="eyebrow">Clientes</span><h2>Nova cliente</h2></div></div><form className="form-stack" onSubmit={submit}><label>Nome<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp<input required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="primary-btn" disabled={busy}>Cadastrar</button><button type="button" className="text-btn" onClick={()=>setOpen(false)}>Cancelar</button></form></section></div>}
  </div>
}
