import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  session: { user: { id: string } } | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
  uploadAvatar: (file: File) => Promise<{ url: string | null; error: string | null }>
  setStatus: (status: Profile['status']) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      set({ session, user: profile, initialized: true })

      // Mark as online
      await supabase
        .from('profiles')
        .update({ status: 'online' })
        .eq('id', session.user.id)
    } else {
      set({ initialized: true })
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ session, user: profile })
      } else if (event === 'SIGNED_OUT') {
        set({ session: null, user: null })
      }
    })
  },

  signUp: async (email, password, username) => {
    set({ loading: true })
    try {
      // Check username availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (existing) {
        return { error: 'Username already taken' }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
        },
      })

      if (error) return { error: error.message }
      return { error: null }
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    const { user } = get()
    if (user) {
      await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', user.id)
    }
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    set({ user: data })
    return { error: null }
  },

  uploadAvatar: async (file) => {
    const { user } = get()
    if (!user) return { url: null, error: 'Not authenticated' }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) return { url: null, error: uploadError.message }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl

    await get().updateProfile({ avatar_url: url })
    return { url, error: null }
  },

  setStatus: async (status) => {
    const { user } = get()
    if (!user) return
    await supabase.from('profiles').update({ status }).eq('id', user.id)
    set(state => ({ user: state.user ? { ...state.user, status } : null }))
  },
}))
