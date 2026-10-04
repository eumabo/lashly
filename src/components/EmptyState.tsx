import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
export default function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon/></div><h3>{title}</h3><p>{text}</p>{action}</div>
}
