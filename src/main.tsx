import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
})

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Bridge] Uncaught error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#020817', color: '#94a3b8', fontFamily: 'system-ui', padding: '2rem',
        }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Erro ao inicializar o Bridge
          </h1>
          <p style={{ marginBottom: '1.5rem', textAlign: 'center', maxWidth: '480px' }}>
            Verifique se as variáveis de ambiente estão configuradas no Vercel:<br />
            <code style={{ color: '#a78bfa' }}>VITE_SUPABASE_URL</code> e{' '}
            <code style={{ color: '#a78bfa' }}>VITE_SUPABASE_ANON_KEY</code>
          </p>
          <pre style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.75rem', color: '#f87171', maxWidth: '90vw', overflow: 'auto' }}>
            {(this.state.error as Error).message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
