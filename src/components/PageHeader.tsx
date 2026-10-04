import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'

export default function PageHeader({ title, subtitle, back, settings, action }: { title: string; subtitle?: string; back?: boolean; settings?: boolean; action?: ReactNode }) {
  return <header className="page-header">
    <div className="page-heading-row">
      <div className="heading-left">
        {back && <button type="button" onClick={() => window.history.back()} className="icon-btn" aria-label="Voltar"><ArrowLeft/></button>}
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      <div className="header-actions">{action}{settings && <Link to="/configuracoes" className="icon-btn"><Settings/></Link>}</div>
    </div>
  </header>
}
