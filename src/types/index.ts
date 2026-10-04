export type AppointmentStatus = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu'
export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito' | 'Outro'

export interface Client {
  id: string
  name: string
  phone: string
  email?: string | null
  birth_date?: string | null
  notes?: string | null
  created_at?: string
}

export interface Service {
  id: string
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  active: boolean
}

export interface Appointment {
  id: string
  client_id: string
  service_id: string
  date: string
  start_time: string
  end_time: string
  price: number
  appointment_status: AppointmentStatus
  reminder_enabled?: boolean
  reminder_minutes?: number
  notes?: string | null
  created_at?: string
}

export interface Payment {
  id: string
  appointment_id: string
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  notes?: string | null
}

export interface Income {
  id: string
  description: string
  amount: number
  date: string
  payment_method: PaymentMethod
  notes?: string | null
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes?: string | null
}

export interface Material {
  id: string
  name: string
  category?: string | null
  quantity: number
  notes?: string | null
}

export interface MaterialPurchase {
  id: string
  material_id: string
  quantity: number
  amount: number
  purchase_date: string
  expense_id?: string | null
  notes?: string | null
}

export interface AppData {
  clients: Client[]
  services: Service[]
  appointments: Appointment[]
  payments: Payment[]
  incomes: Income[]
  expenses: Expense[]
  materials: Material[]
  materialPurchases: MaterialPurchase[]
}
