import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { AuthPage } from '@/components/auth/AuthPage'
import { AppLayout } from '@/components/layout/AppLayout'

function App() {
  const { user, initialized, initialize } = useAuthStore()
  const { loadCommunities } = useAppStore()

  // Initialize auth on app start
  useEffect(() => {
    initialize()
  }, [])

  // Load communities when user logs in
  useEffect(() => {
    if (user?.id) {
      loadCommunities(user.id)

      // Handle invite links on page load
      const params = new URLSearchParams(window.location.search)
      const inviteCode = params.get('invite')
      if (inviteCode) {
        // Clear URL
        window.history.replaceState({}, '', window.location.pathname)
        // Trigger join modal
        setTimeout(() => {
          const event = new CustomEvent('nexus:invite', { detail: { code: inviteCode } })
          window.dispatchEvent(event)
        }, 1000)
      }
    }
  }, [user?.id])

  // Loading screen
  if (!initialized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl shadow-glow flex items-center justify-center animate-pulse-slow">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-text-muted text-sm">Loading Nexus...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {user ? <AppLayout /> : <AuthPage />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f1f2e',
            color: '#e8e8f0',
            border: '1px solid #2d2d42',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          },
          success: {
            iconTheme: { primary: '#3bce6f', secondary: '#1f1f2e' },
          },
          error: {
            iconTheme: { primary: '#f04747', secondary: '#1f1f2e' },
          },
        }}
      />
    </>
  )
}

export default App
