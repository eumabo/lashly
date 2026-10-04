import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value || 0))

export const dateBR = (date: string) => {
  try { return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR }) } catch { return date }
}

export const id = () => crypto.randomUUID()

export const phoneDigits = (value: string) => value.replace(/\D/g, '')

export const whatsappUrl = (phone: string) => {
  const digits = phoneDigits(phone)
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export const nowTime = () => format(new Date(), 'HH:mm')
