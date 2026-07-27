import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AuthContext } from './authContext'
import { friendlyError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; userId: string }

function friendlySignInError(message: string): string {
  if (/anonymous/i.test(message) && /disabled|not enabled/i.test(message)) {
    return (
      'Anonymous sign-ins are disabled for this Supabase project. ' +
      'Enable them under Authentication → Sign In / Providers → Anonymous, then reload.'
    )
  }
  return friendlyError(message, 'Sign-in failed. Please try again.')
}

let signInFlight: Promise<string> | null = null

async function resolveSession(): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  if (session) return session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.session) {
    throw new Error(error?.message ?? 'Sign-in returned no session.')
  }
  return data.session.user.id
}

function signInOnce(): Promise<string> {
  if (!signInFlight) {
    signInFlight = resolveSession().finally(() => {
      signInFlight = null
    })
  }
  return signInFlight
}

interface AuthProviderProps {
  children: ReactNode
  loadingFallback: ReactNode
  renderError: (message: string, retry: () => void) => ReactNode
}

export function AuthProvider({ children, loadingFallback, renderError }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const queryClient = useQueryClient()
  const activeUserId = useRef<string | null>(null)

  const adoptUser = useCallback(
    (userId: string) => {
      if (activeUserId.current !== null && activeUserId.current !== userId) {
        queryClient.clear()
      }
      activeUserId.current = userId
      setState({ status: 'ready', userId })
    },
    [queryClient],
  )

  const signIn = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      adoptUser(await signInOnce())
    } catch (error) {
      setState({
        status: 'error',
        message: friendlySignInError(
          error instanceof Error ? error.message : 'Could not start a guest session.',
        ),
      })
    }
  }, [adoptUser])

  useEffect(() => {
    void signIn()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        adoptUser(session.user.id)
        return
      }
      activeUserId.current = null
      queryClient.clear()
      void signIn()
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [signIn, adoptUser, queryClient])

  const resetGuest = useCallback(async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw new Error(signOutError.message)
      const userId = await signInOnce()
      adoptUser(userId)
      toast.success('Started a fresh guest session')
    } catch (error) {
      toast.error(friendlyError(error, 'Could not reset the guest session.'))
    }
  }, [adoptUser])

  if (state.status === 'loading') return loadingFallback
  if (state.status === 'error') {
    return renderError(state.message, () => {
      void signIn()
    })
  }

  return (
    <AuthContext.Provider value={{ userId: state.userId, resetGuest }}>
      {children}
    </AuthContext.Provider>
  )
}
