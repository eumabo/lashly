import { useState } from 'react'
import { ChevronRight, Plus, Scissors, Trash2, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useData } from '../lib/data'
import { money } from '../lib/utils'
import type { Service } from '../types'

export default function ServicesPage(){
  const {data,addService,updateService,deleteService}=useData()
  const [mode,setMode]=useState<'none'|'new'|'edit'>('none')
  const [editing,setEditing]=useState<Service|null>(null)
  const [name,setName]=useState('')
  const [price,setPrice]=useState('')
  const [duration,setDuration]=useState('90')
  const [active,setActive]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  function openNew(){setEditing(null);setName('');setPrice('');setDuration('90');setActive(true);setMessage('');setMode('new')}
  function openEdit(service:Service){setEditing(service);setName(service.name);setPrice(String(service.price));setDuration(String(service.duration_minutes));setActive(service.active);setMessage('');setMode('edit')}
  function close(){setMode('none');setEditing(null);setMessage('')}

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage('')
    try{
      const payload={name:name.trim(),description:editing?.description||'',price:Number(price),duration_minutes:Number(duration),active}
      if(editing) await updateService(editing.id,payload)
      else await addService(payload)
      close()
    }catch(err:any){setMessage(err?.message||'Não foi possível salvar o serviço.')}
    finally{setBusy(false)}
  }

  async function remove(){
    if(!editing) return
    if(!confirm(`Excluir o serviço "${editing.name}"?`)) return
    setBusy(true);setMessage('')
    try{await deleteService(editing.id);close()}
    catch(err:any){setMessage(err?.message||'Não foi possível excluir.')}
    finally{setBusy(false)}
  }

  return <div className="page">
    <PageHeader title="Serviços" subtitle="Preços e duração" action={<button className="icon-btn" onClick={openNew} aria-label="Novo serviço"><Plus/></button>}/>
    {data.services.length===0?<EmptyState icon={Scissors} title="Nenhum serviço" text="Cadastre o primeiro serviço para usar na agenda." action={<button className="primary-btn inline" onClick={openNew}>Cadastrar serviço</button>}/>:<div className="service-list">{data.services.map(s=><button className={`service-card service-card-button ${!s.active?'disabled':''}`} key={s.id} onClick={()=>openEdit(s)}><div><b>{s.name}</b><span>{s.duration_minutes} min · {s.active?'Ativo':'Inativo'}</span></div><div className="service-price"><b>{money(s.price)}</b><ChevronRight/></div></button>)}</div>}

    {mode!=='none'&&<div className="sheet-backdrop" onMouseDown={close}><section className="sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-head"><div><span className="eyebrow">Serviços</span><h2>{mode==='new'?'Novo serviço':'Editar serviço'}</h2></div><button className="icon-btn" onClick={close}><X/></button></div>
      <form className="form-stack" onSubmit={submit}>
        <label>Nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Extensão de cílios"/></label>
        <div className="form-row"><label>Preço<input required inputMode="decimal" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Duração (min)<input required inputMode="numeric" type="number" min="5" step="5" value={duration} onChange={e=>setDuration(e.target.value)}/></label></div>
        <label className="switch-row"><span><b>Serviço ativo</b><small>{active?'Aparece ao criar agendamentos':'Oculto em novos agendamentos'}</small></span><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/></label>
        {message&&<div className="error-banner">{message}</div>}
        <div className="sticky-sheet-actions"><button className="primary-btn" disabled={busy}>{editing?'Salvar alterações':'Cadastrar serviço'}</button>{editing&&<button type="button" className="danger-btn compact-danger" disabled={busy} onClick={remove}><Trash2/> Excluir serviço</button>}</div>
      </form>
    </section></div>}
  </div>
}
