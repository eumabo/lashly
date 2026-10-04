import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, CircleDollarSign, Home, Package, Plus, Settings, Sparkles, Users } from 'lucide-react'
import { DEFAULT_PROFILE_IMAGE, useAuth } from '../lib/auth'
import QuickAddSheet from './QuickAddSheet'

const desktopNav = [
  { to: '/', label: 'Visão geral', icon: Home, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: CircleDollarSign, end: false },
  { to: '/materiais', label: 'Materiais', icon: Package, end: false },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, end: false },
]

const mobileNav = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: CircleDollarSign, end: false },
  { to: '/materiais', label: 'Materiais', icon: Package, end: false },
  { to: '/servicos', label: 'Serviços', icon: Sparkles, end: false },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, end: false },
  { to: '/configuracoes', label: 'Ajustes', icon: Settings, end: false },
]

export default function AppLayout() {
  const [quickOpen, setQuickOpen] = useState(false)
  const { demoMode, profileName, profileAvatarUrl } = useAuth()

  return (
    <div className="app-shell">
      <header className="desktop-topbar">
        <NavLink to="/" className="topbar-brand" aria-label="Lashly">
          <img src="/lashly-default-icon.png" alt="" />
          <div><b>Lashly</b><span>seu estúdio em ordem</span></div>
        </NavLink>

        <nav className="desktop-nav-pills" aria-label="Navegação principal">
          {desktopNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `desktop-nav-pill ${isActive ? 'active' : ''}`}>
              <Icon size={17}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink to="/configuracoes" className="topbar-profile">
          <div className="topbar-avatar"><img src={profileAvatarUrl || DEFAULT_PROFILE_IMAGE} alt="" /></div>
          <div><b>{profileName}</b><span>{demoMode ? 'Modo demonstração' : 'Conta conectada'}</span></div>
          <Settings size={17}/>
        </NavLink>
      </header>

      <main className="app-main">
        {demoMode && <div className="demo-bar"><Sparkles size={14}/> Modo demonstração — seus dados ficam só neste navegador.</div>}
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegação mobile">
        <div className="bottom-nav-scroll">
          {mobileNav.map(({ to, label, icon: Icon, end }, index) => (
            <div className="bottom-nav-item" key={to}>
              {index === 2 && <span className="bottom-fab-slot" aria-hidden="true" />}
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </div>
          ))}
        </div>
        <button className="fab" onClick={() => setQuickOpen(true)} aria-label="Adicionar"><Plus/></button>
      </nav>

      <button className="desktop-fab" onClick={() => setQuickOpen(true)}><Plus size={18}/> Novo</button>
      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
