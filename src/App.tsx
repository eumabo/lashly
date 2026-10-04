import { Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from './lib/data'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
import ClientsPage from './pages/ClientsPage'
import ClientPage from './pages/ClientPage'
import FinancePage from './pages/FinancePage'
import MaterialsPage from './pages/MaterialsPage'
import ServicesPage from './pages/ServicesPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AppLayout from './components/AppLayout'

function FullscreenLoading() {
  return <div className="boot-screen"><img className="boot-logo" src="/lashly-default-icon.png" alt=""/><strong>Lashly</strong><span>Carregando…</span></div>
}

export default function App() {
  const { loading, user, demoMode } = useAuth()
  if (loading) return <FullscreenLoading />
  if (!demoMode && !user) return <LoginPage />

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="clientes/:id" element={<ClientPage />} />
          <Route path="financeiro" element={<FinancePage />} />
          <Route path="materiais" element={<MaterialsPage />} />
          <Route path="servicos" element={<ServicesPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataProvider>
  )
}
