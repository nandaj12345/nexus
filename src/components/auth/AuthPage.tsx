import React, { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

type Mode = 'login' | 'signup'

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { signIn, signUp, loading } = useAuthStore()

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!email.includes('@')) errs.email = 'Valid email required'
    if (password.length < 6) errs.password = 'At least 6 characters'
    if (mode === 'signup' && username.length < 2) errs.username = 'At least 2 characters'
    if (mode === 'signup' && !/^[a-zA-Z0-9_]+$/.test(username)) {
      errs.username = 'Letters, numbers, and underscores only'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) toast.error(error)
    } else {
      const { error } = await signUp(email, password, username)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Check your email to confirm your account!')
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-brand-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-glow mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nexus</h1>
          <p className="text-text-muted text-sm mt-1">Your communities, reimagined</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 shadow-card">
          <div className="flex gap-1 mb-6 p-1 bg-bg-tertiary rounded-xl">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}) }}
                className={`
                  flex-1 py-2 text-sm font-medium rounded-lg transition-all
                  ${mode === m
                    ? 'bg-bg-elevated text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <Input
                label="Username"
                placeholder="cooluser_42"
                value={username}
                onChange={e => setUsername(e.target.value)}
                error={errors.username}
                autoComplete="username"
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-text-muted text-xs mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrors({}) }}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          By signing up, you agree to our{' '}
          <span className="text-brand-400">Terms of Service</span>{' '}
          and{' '}
          <span className="text-brand-400">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}

export default AuthPage
