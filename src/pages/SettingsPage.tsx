import { useEffect, useRef, useState } from 'react'
import { BarChart3, Camera, Database, LogOut, Package, RotateCcw, Save, Smartphone, Sparkles, Upload, UserRound, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import NotificationSettings from '../components/NotificationSettings'
import { DEFAULT_APP_ICON, DEFAULT_PROFILE_IMAGE, useAuth } from '../lib/auth'

export default function SettingsPage(){
  const {
    demoMode, signOut, user, profileName, updateProfileName,
    profileAvatarUrl, appIconUrl, updateProfileAvatar, updateAppIcon,
  }=useAuth()
  const [name,setName]=useState(profileName)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [mediaBusy,setMediaBusy]=useState<'avatar'|'icon'|''>('')
  const avatarInput=useRef<HTMLInputElement>(null)
  const iconInput=useRef<HTMLInputElement>(null)

  useEffect(()=>setName(profileName),[profileName])

  async function saveName(e:React.FormEvent){
    e.preventDefault(); setSaving(true); setMessage('')
    const error=await updateProfileName(name)
    setMessage(error || 'Nome atualizado.')
    setSaving(false)
  }

  async function handleImage(kind:'avatar'|'icon',file?:File){
    if(!file)return
    setMediaBusy(kind); setMessage('')
    const error=kind==='avatar'?await updateProfileAvatar(file):await updateAppIcon(file)
    setMessage(error || (kind==='avatar'?'Foto de perfil atualizada.':'Ícone do app atualizado.'))
    setMediaBusy('')
    if(avatarInput.current)avatarInput.current.value=''
    if(iconInput.current)iconInput.current.value=''
  }

  async function resetImage(kind:'avatar'|'icon'){
    setMediaBusy(kind); setMessage('')
    const error=kind==='avatar'?await updateProfileAvatar(null):await updateAppIcon(null)
    setMessage(error || (kind==='avatar'?'Foto de perfil voltou ao padrão.':'Ícone voltou ao padrão do Lashly.'))
    setMediaBusy('')
  }

  return <div className="page settings-page">
    <PageHeader title="Configurações" subtitle="Seu Lashly, do seu jeito"/>

    <section className="settings-profile identity-card settings-identity-card">
      <div className="profile-image-shell"><img src={profileAvatarUrl || DEFAULT_PROFILE_IMAGE} alt="Foto do perfil"/></div>
      <div className="profile-copy">
        <span className="eyebrow">Seu perfil</span>
        <h2>{profileName}</h2>
        <p>{demoMode?'Modo demonstração':user?.email}</p>
      </div>
      <div className="profile-quick-actions">
        <button className="soft-btn compact-action" type="button" onClick={()=>avatarInput.current?.click()} disabled={mediaBusy==='avatar'}>
          <Camera/><span>{mediaBusy==='avatar'?'Salvando…':'Trocar foto'}</span>
        </button>
        {profileAvatarUrl&&<button className="profile-reset-btn" type="button" onClick={()=>resetImage('avatar')} disabled={mediaBusy==='avatar'} aria-label="Usar foto padrão"><RotateCcw/></button>}
      </div>
      <input ref={avatarInput} hidden type="file" accept="image/*" onChange={e=>handleImage('avatar',e.target.files?.[0])}/>
    </section>

    <form className="profile-name-card settings-compact-card" onSubmit={saveName}>
      <div className="profile-name-heading"><div className="round-icon"><UserRound/></div><div><b>Nome exibido</b><span>Usado na saudação e no perfil.</span></div></div>
      <div className="profile-name-form settings-name-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Como você quer ser chamada?" maxLength={50}/><button className="primary-btn settings-save-btn" disabled={saving || !name.trim()}><Save/><span>{saving?'Salvando…':'Salvar'}</span></button></div>
    </form>

    <section className="personalization-card app-icon-card settings-app-icon-card">
      <div className="personalization-head settings-app-icon-head"><div className="round-icon"><Smartphone/></div><div><b>Ícone do aplicativo</b><span>A imagem que aparece quando o Lashly é salvo na Tela de Início.</span></div></div>
      <div className="settings-app-icon-row">
        <div className="app-icon-preview compact-app-preview"><img src={appIconUrl || DEFAULT_APP_ICON} alt="Prévia do ícone do aplicativo"/><div><b>Lashly</b><span>Prévia da Tela de Início</span></div></div>
        <div className="media-actions compact-media-actions">
          <button className="soft-btn" type="button" onClick={()=>iconInput.current?.click()} disabled={mediaBusy==='icon'}><Upload/><span>{mediaBusy==='icon'?'Salvando…':'Trocar ícone'}</span></button>
          {appIconUrl&&<button className="text-btn" type="button" onClick={()=>resetImage('icon')} disabled={mediaBusy==='icon'}><RotateCcw/> Padrão</button>}
        </div>
      </div>
      <input ref={iconInput} hidden type="file" accept="image/*" onChange={e=>handleImage('icon',e.target.files?.[0])}/>
      <div className="iphone-note compact-iphone-note"><Smartphone/><span>No iPhone, depois de trocar o ícone, remova o atalho antigo e adicione o Lashly novamente pelo Safari.</span></div>
    </section>

    {message && <div className="save-message settings-save-message">{message}</div>}

    <NotificationSettings/>

    <div className="settings-list settings-links-clean">
      <Link to="/servicos"><Wrench/><span><b>Serviços</b><small>Preços, duração e disponibilidade</small></span></Link>
      <Link to="/materiais"><Package/><span><b>Materiais</b><small>Compras e estoque</small></span></Link>
      <Link to="/relatorios"><BarChart3/><span><b>Relatórios</b><small>Faturamento e desempenho</small></span></Link>
      <div className="settings-item static"><Database/><span><b>{demoMode?'Dados locais':'Supabase conectado'}</b><small>{demoMode?'Os dados ficam neste navegador.':'Seus dados estão vinculados à sua conta.'}</small></span></div>
    </div>

    {demoMode?<div className="demo-connect"><Sparkles/><div><b>Modo demonstração</b><p>Você pode testar o Lashly livremente. Ao conectar o Supabase, os dados passam a ficar vinculados à sua conta.</p></div></div>:<button className="danger-btn settings-logout" onClick={()=>signOut()}><LogOut/> Sair da conta</button>}
  </div>
}
