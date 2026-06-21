import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useWorldStore } from '../../store/useWorldStore'

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrateAuth = useWorldStore((state) => state.hydrateAuth)
  const applySession = useWorldStore((state) => state.applySession)

  useEffect(() => {
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      useWorldStore.setState({
        authReady: true,
        isAuthenticated: true,
        user: {
          id: 'e2e-user',
          email: 'e2e@worldify.local',
        } as never,
        authError: null,
        authMessage: null,
      })
      return
    }

    void hydrateAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [applySession, hydrateAuth])

  return <>{children}</>
}
