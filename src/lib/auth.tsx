import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabase'

export const DEFAULT_PROFILE_IMAGE = '/lashly-default-logo.png'
export const DEFAULT_APP_ICON = '/lashly-default-icon.png'

const MEDIA_BUCKET = 'lashly-media'
const DEMO_PROFILE_KEY = 'lashly-profile-name'
const DEMO_AVATAR_KEY = 'lashly-profile-avatar'
const DEMO_ICON_KEY = 'lashly-app-icon'

type AuthContextValue = {
  loading: boolean
  user: User | null
  demoMode: boolean
  profileName: string
  profileAvatarUrl: string
  appIconUrl: string
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
  updateProfileName: (name: string) => Promise<string | null>
  updateProfileAvatar: (file: File | null) => Promise<string | null>
  updateAppIcon: (file: File | null) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function fallbackName(user: User | null) {
  const metadataName = user?.user_metadata?.name || user?.user_metadata?.full_name
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim()
  const emailName = user?.email?.split('@')[0]?.trim()
  return emailName || 'Profissional'
}

function applyBrowserIcon(rawUrl: string) {
  const url = rawUrl || DEFAULT_APP_ICON
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (apple) apple.href = url

  const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (iconLinks.length) iconLinks.forEach(link => { link.href = url })
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

async function squareImage(file: File, size: number, background: string | null) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 12 * 1024 * 1024) throw new Error('A imagem precisa ter menos de 12 MB.')

  const src = await fileToDataUrl(file)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
    img.src = src
  })

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem.')

  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, size, size)
  }

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar a imagem.')), 'image/png', 0.94)
  })
  return blob
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseConfigured)
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState(() => localStorage.getItem(DEMO_PROFILE_KEY) || 'Profissional')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(() => localStorage.getItem(DEMO_AVATAR_KEY) || '')
  const [appIconUrl, setAppIconUrl] = useState(() => localStorage.getItem(DEMO_ICON_KEY) || '')

  useEffect(() => applyBrowserIcon(appIconUrl), [appIconUrl])

  const hydrateProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser || !supabase) {
      setProfileName(localStorage.getItem(DEMO_PROFILE_KEY) || 'Profissional')
      setProfileAvatarUrl(localStorage.getItem(DEMO_AVATAR_KEY) || '')
      setAppIconUrl(localStorage.getItem(DEMO_ICON_KEY) || '')
      return
    }

    const fallback = fallbackName(currentUser)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url, app_icon_url')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setProfileName(data.name?.trim() || fallback)
        setProfileAvatarUrl(data.avatar_url || '')
        setAppIconUrl(data.app_icon_url || '')
        return
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        name: fallback,
        business_name: 'Lashly',
      })
      if (upsertError) throw upsertError
      setProfileName(fallback)
      setProfileAvatarUrl('')
      setAppIconUrl('')
    } catch {
      setProfileName(fallback)
      setProfileAvatarUrl('')
      setAppIconUrl('')
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      await hydrateProfile(currentUser)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      void hydrateProfile(currentUser).finally(() => setLoading(false))
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [hydrateProfile])

  const uploadMedia = useCallback(async (kind: 'avatar' | 'app-icon', file: File | null) => {
    const isIcon = kind === 'app-icon'
    const setter = isIcon ? setAppIconUrl : setProfileAvatarUrl
    const demoKey = isIcon ? DEMO_ICON_KEY : DEMO_AVATAR_KEY

    if (!file) {
      if (!supabaseConfigured || !supabase || !user) {
        localStorage.removeItem(demoKey)
        setter('')
        return null
      }

      const path = `${user.id}/${kind}.png`
      await supabase.storage.from(MEDIA_BUCKET).remove([path])
      const column = isIcon ? 'app_icon_url' : 'avatar_url'
      const { error } = await supabase.from('profiles').update({ [column]: null }).eq('id', user.id)
      if (error) return error.message
      setter('')
      return null
    }

    try {
      const blob = await squareImage(file, isIcon ? 512 : 480, isIcon ? '#090909' : null)

      if (!supabaseConfigured || !supabase || !user) {
        const dataUrl = await fileToDataUrl(blob)
        localStorage.setItem(demoKey, dataUrl)
        setter(dataUrl)
        return null
      }

      const path = `${user.id}/${kind}.png`
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
        upsert: true,
        contentType: 'image/png',
        cacheControl: '3600',
      })
      if (uploadError) return `Não foi possível enviar a imagem: ${uploadError.message}`

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`
      const column = isIcon ? 'app_icon_url' : 'avatar_url'
      const { error: profileError } = await supabase.from('profiles').update({ [column]: publicUrl }).eq('id', user.id)
      if (profileError) return profileError.message
      setter(publicUrl)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Não foi possível salvar a imagem.'
    }
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    user,
    profileName,
    profileAvatarUrl,
    appIconUrl,
    demoMode: !supabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) return null
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
    },
    resetPassword: async (email) => {
      if (!supabase) return null
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      return error?.message ?? null
    },
    updateProfileName: async (rawName) => {
      const name = rawName.trim()
      if (!name) return 'Digite um nome válido.'

      if (!supabaseConfigured || !supabase || !user) {
        localStorage.setItem(DEMO_PROFILE_KEY, name)
        setProfileName(name)
        return null
      }

      const { error } = await supabase.from('profiles').upsert({ id: user.id, name, business_name: 'Lashly' })
      if (error) return error.message
      setProfileName(name)
      return null
    },
    updateProfileAvatar: file => uploadMedia('avatar', file),
    updateAppIcon: file => uploadMedia('app-icon', file),
  }), [loading, user, profileName, profileAvatarUrl, appIconUrl, uploadMedia])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
