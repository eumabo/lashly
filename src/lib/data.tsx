import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDays, addHours, format } from 'date-fns'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { id } from './utils'
import type {
  AppData, Appointment, Client, Expense, Income, Material, MaterialPurchase, Payment, Service,
} from '../types'

const emptyData: AppData = {
  clients: [], services: [], appointments: [], payments: [], incomes: [], expenses: [], materials: [], materialPurchases: [],
}

function demoSeed(): AppData {
  const today = new Date()
  const date = format(today, 'yyyy-MM-dd')
  const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd')
  const currentHour = Number(format(today, 'HH'))
  const slot = Math.min(Math.max(currentHour + 1, 9), 18)
  const start = `${String(slot).padStart(2, '0')}:00`
  const end = `${String(Math.min(slot + 2, 20)).padStart(2, '0')}:00`

  return {
    clients: [
      { id: 'c1', name: 'Mariana Souza', phone: '27999990001', notes: 'Prefere horários à tarde.' },
      { id: 'c2', name: 'Ana Paula', phone: '27999990002' },
      { id: 'c3', name: 'Camila Rocha', phone: '27999990003' },
    ],
    services: [
      { id: 's1', name: 'Extensão de cílios', price: 150, duration_minutes: 120, active: true },
      { id: 's2', name: 'Manutenção', price: 100, duration_minutes: 90, active: true },
      { id: 's3', name: 'Remoção', price: 50, duration_minutes: 45, active: true },
    ],
    appointments: [
      { id: 'a1', client_id: 'c1', service_id: 's1', date, start_time: start, end_time: end, price: 150, appointment_status: 'confirmado', reminder_enabled: true, reminder_minutes: 60 },
      { id: 'a2', client_id: 'c2', service_id: 's2', date: tomorrow, start_time: '10:00', end_time: '11:30', price: 100, appointment_status: 'agendado', reminder_enabled: true, reminder_minutes: 60 },
    ],
    payments: [],
    incomes: [],
    expenses: [
      { id: 'e1', description: 'Compra de materiais', amount: 89.9, category: 'Materiais', date },
    ],
    materials: [
      { id: 'm1', name: 'Cola Lash Premium', category: 'Colas', quantity: 2 },
    ],
    materialPurchases: [],
  }
}

type NewClient = Omit<Client, 'id' | 'created_at'>
type NewService = Omit<Service, 'id'>
type NewAppointment = Omit<Appointment, 'id' | 'created_at'>
type NewPayment = Omit<Payment, 'id'>
type NewIncome = Omit<Income, 'id'>
type NewExpense = Omit<Expense, 'id'>
type NewMaterial = Omit<Material, 'id'>

type DataContextValue = {
  data: AppData
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addClient: (value: NewClient) => Promise<Client>
  updateClient: (clientId: string, value: Partial<NewClient>) => Promise<void>
  deleteClient: (clientId: string) => Promise<void>
  addService: (value: NewService) => Promise<Service>
  updateService: (serviceId: string, value: Partial<NewService>) => Promise<void>
  deleteService: (serviceId: string) => Promise<void>
  addAppointment: (value: NewAppointment) => Promise<Appointment>
  updateAppointment: (appointmentId: string, value: Partial<NewAppointment>) => Promise<void>
  addPayment: (value: NewPayment) => Promise<void>
  updatePayment: (paymentId: string, value: Partial<NewPayment>) => Promise<void>
  deletePayment: (paymentId: string) => Promise<void>
  addIncome: (value: NewIncome) => Promise<void>
  updateIncome: (incomeId: string, value: Partial<NewIncome>) => Promise<void>
  deleteIncome: (incomeId: string) => Promise<void>
  addExpense: (value: NewExpense) => Promise<void>
  updateExpense: (expenseId: string, value: Partial<NewExpense>) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
  addMaterial: (value: NewMaterial) => Promise<Material>
  updateMaterial: (materialId: string, value: Partial<NewMaterial>) => Promise<void>
  deleteMaterial: (materialId: string) => Promise<void>
  registerMaterialPurchase: (materialId: string, quantity: number, amount: number, purchaseDate: string, addToExpenses: boolean, notes?: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)
const STORAGE_KEY = 'lashly-demo-v1'

function normalizeRows(rows: any[] | null, numericFields: string[] = []) {
  return (rows || []).map(row => {
    const copy = { ...row }
    numericFields.forEach(field => { if (field in copy) copy[field] = Number(copy[field] || 0) })
    return copy
  })
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth()
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const saveLocal = useCallback((next: AppData) => {
    setData(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const refresh = useCallback(async () => {
    setError(null)
    if (demoMode) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try { setData(JSON.parse(saved)) } catch { const seed = demoSeed(); saveLocal(seed) }
      } else {
        const seed = demoSeed()
        saveLocal(seed)
      }
      setLoading(false)
      return
    }

    if (!supabase || !user) {
      setData(emptyData)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [clients, services, appointments, payments, incomes, expenses, materials, materialPurchases] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
        supabase.from('appointments').select('*').order('date').order('start_time'),
        supabase.from('payments').select('*').order('paid_at', { ascending: false }),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('materials').select('*').order('name'),
        supabase.from('material_purchases').select('*').order('purchase_date', { ascending: false }),
      ])
      const firstError = [clients, services, appointments, payments, incomes, expenses, materials, materialPurchases].find(r => r.error)?.error
      if (firstError) throw firstError
      setData({
        clients: normalizeRows(clients.data) as Client[],
        services: normalizeRows(services.data, ['price', 'duration_minutes']) as Service[],
        appointments: normalizeRows(appointments.data, ['price']) as Appointment[],
        payments: normalizeRows(payments.data, ['amount']) as Payment[],
        incomes: normalizeRows(incomes.data, ['amount']) as Income[],
        expenses: normalizeRows(expenses.data, ['amount']) as Expense[],
        materials: normalizeRows(materials.data, ['quantity']) as Material[],
        materialPurchases: normalizeRows(materialPurchases.data, ['quantity', 'amount']) as MaterialPurchase[],
      })
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os dados. Confira se o schema do Supabase foi executado.')
    } finally {
      setLoading(false)
    }
  }, [demoMode, saveLocal, user])

  useEffect(() => { void refresh() }, [refresh])

  const userId = user?.id

  const localMutate = (fn: (draft: AppData) => void) => {
    const next: AppData = JSON.parse(JSON.stringify(data))
    fn(next)
    saveLocal(next)
  }

  const addClient = async (value: NewClient) => {
    if (demoMode) {
      const row: Client = { id: id(), ...value }
      localMutate(d => d.clients.push(row))
      return row
    }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { data: row, error } = await supabase.from('clients').insert({ ...value, user_id: userId }).select('*').single()
    if (error) throw error
    await refresh()
    return row as Client
  }

  const updateClient = async (clientId: string, value: Partial<NewClient>) => {
    if (demoMode) { localMutate(d => Object.assign(d.clients.find(x => x.id === clientId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('clients').update(value).eq('id', clientId)
    if (error) throw error
    await refresh()
  }

  const deleteClient = async (clientId: string) => {
    if (data.appointments.some(a => a.client_id === clientId)) throw new Error('Essa cliente possui atendimentos vinculados. Mantenha o histórico e edite os dados em vez de excluir.')
    if (demoMode) { localMutate(d => { d.clients = d.clients.filter(x => x.id !== clientId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) throw error
    await refresh()
  }

  const addService = async (value: NewService) => {
    if (demoMode) {
      const row: Service = { id: id(), ...value }
      localMutate(d => d.services.push(row))
      return row
    }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { data: row, error } = await supabase.from('services').insert({ ...value, user_id: userId }).select('*').single()
    if (error) throw error
    await refresh()
    return row as Service
  }

  const updateService = async (serviceId: string, value: Partial<NewService>) => {
    if (demoMode) { localMutate(d => Object.assign(d.services.find(x => x.id === serviceId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('services').update(value).eq('id', serviceId)
    if (error) throw error
    await refresh()
  }

  const deleteService = async (serviceId: string) => {
    if (data.appointments.some(a => a.service_id === serviceId)) throw new Error('Esse serviço já possui atendimentos no histórico. Você pode desativá-lo, mas não excluir.')
    if (demoMode) { localMutate(d => { d.services = d.services.filter(x => x.id !== serviceId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) throw error
    await refresh()
  }

  const addAppointment = async (value: NewAppointment) => {
    if (demoMode) {
      const row: Appointment = { id: id(), ...value }
      localMutate(d => d.appointments.push(row))
      return row
    }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { data: row, error } = await supabase.from('appointments').insert({ ...value, user_id: userId }).select('*').single()
    if (error) throw error
    await refresh()
    return row as Appointment
  }

  const updateAppointment = async (appointmentId: string, value: Partial<NewAppointment>) => {
    if (demoMode) { localMutate(d => Object.assign(d.appointments.find(x => x.id === appointmentId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('appointments').update(value).eq('id', appointmentId)
    if (error) throw error
    await refresh()
  }

  const addPayment = async (value: NewPayment) => {
    if (demoMode) { localMutate(d => d.payments.push({ id: id(), ...value })); return }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { error } = await supabase.from('payments').insert({ ...value, user_id: userId })
    if (error) throw error
    await refresh()
  }

  const updatePayment = async (paymentId: string, value: Partial<NewPayment>) => {
    if (demoMode) { localMutate(d => Object.assign(d.payments.find(x => x.id === paymentId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('payments').update(value).eq('id', paymentId)
    if (error) throw error
    await refresh()
  }

  const deletePayment = async (paymentId: string) => {
    if (demoMode) { localMutate(d => { d.payments = d.payments.filter(x => x.id !== paymentId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('payments').delete().eq('id', paymentId)
    if (error) throw error
    await refresh()
  }

  const addIncome = async (value: NewIncome) => {
    if (demoMode) { localMutate(d => d.incomes.push({ id: id(), ...value })); return }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { error } = await supabase.from('incomes').insert({ ...value, user_id: userId })
    if (error) throw error
    await refresh()
  }

  const updateIncome = async (incomeId: string, value: Partial<NewIncome>) => {
    if (demoMode) { localMutate(d => Object.assign(d.incomes.find(x => x.id === incomeId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('incomes').update(value).eq('id', incomeId)
    if (error) throw error
    await refresh()
  }

  const deleteIncome = async (incomeId: string) => {
    if (demoMode) { localMutate(d => { d.incomes = d.incomes.filter(x => x.id !== incomeId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('incomes').delete().eq('id', incomeId)
    if (error) throw error
    await refresh()
  }

  const addExpense = async (value: NewExpense) => {
    if (demoMode) { localMutate(d => d.expenses.push({ id: id(), ...value })); return }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { error } = await supabase.from('expenses').insert({ ...value, user_id: userId })
    if (error) throw error
    await refresh()
  }

  const updateExpense = async (expenseId: string, value: Partial<NewExpense>) => {
    if (demoMode) { localMutate(d => Object.assign(d.expenses.find(x => x.id === expenseId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('expenses').update(value).eq('id', expenseId)
    if (error) throw error
    await refresh()
  }

  const deleteExpense = async (expenseId: string) => {
    if (demoMode) { localMutate(d => { d.expenses = d.expenses.filter(x => x.id !== expenseId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) throw error
    await refresh()
  }

  const addMaterial = async (value: NewMaterial) => {
    if (demoMode) {
      const row: Material = { id: id(), ...value }
      localMutate(d => d.materials.push(row))
      return row
    }
    if (!supabase || !userId) throw new Error('Sessão inválida')
    const { data: row, error } = await supabase.from('materials').insert({ ...value, user_id: userId }).select('*').single()
    if (error) throw error
    await refresh()
    return row as Material
  }

  const updateMaterial = async (materialId: string, value: Partial<NewMaterial>) => {
    if (demoMode) { localMutate(d => Object.assign(d.materials.find(x => x.id === materialId)!, value)); return }
    if (!supabase) return
    const { error } = await supabase.from('materials').update(value).eq('id', materialId)
    if (error) throw error
    await refresh()
  }

  const deleteMaterial = async (materialId: string) => {
    if (data.materialPurchases.some(p => p.material_id === materialId)) throw new Error('Esse material possui compras no histórico. Edite o nome/estoque em vez de excluir.')
    if (demoMode) { localMutate(d => { d.materials = d.materials.filter(x => x.id !== materialId) }); return }
    if (!supabase) return
    const { error } = await supabase.from('materials').delete().eq('id', materialId)
    if (error) throw error
    await refresh()
  }

  const registerMaterialPurchase = async (materialId: string, quantity: number, amount: number, purchaseDate: string, addToExpenses: boolean, notes = '') => {
    if (demoMode) {
      localMutate(d => {
        const material = d.materials.find(x => x.id === materialId)
        if (!material) throw new Error('Material não encontrado')
        material.quantity += quantity
        let expenseId: string | null = null
        if (addToExpenses) {
          expenseId = id()
          d.expenses.push({ id: expenseId, description: `Compra: ${material.name}`, amount, category: 'Materiais', date: purchaseDate, notes })
        }
        d.materialPurchases.push({ id: id(), material_id: materialId, quantity, amount, purchase_date: purchaseDate, expense_id: expenseId, notes })
      })
      return
    }
    if (!supabase) return
    const { error } = await supabase.rpc('register_material_purchase', {
      p_material_id: materialId,
      p_quantity: quantity,
      p_amount: amount,
      p_purchase_date: purchaseDate,
      p_add_to_expenses: addToExpenses,
      p_notes: notes || null,
    })
    if (error) throw error
    await refresh()
  }

  const value = useMemo<DataContextValue>(() => ({
    data, loading, error, refresh, addClient, updateClient, deleteClient, addService, updateService, deleteService, addAppointment, updateAppointment,
    addPayment, updatePayment, deletePayment, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, addMaterial, updateMaterial, deleteMaterial, registerMaterialPurchase,
  }), [data, loading, error, refresh])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData precisa estar dentro de DataProvider')
  return context
}
