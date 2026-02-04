import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Check if we have a valid Clerk key (not the placeholder)
const isValidClerkKey = PUBLISHABLE_KEY &&
  PUBLISHABLE_KEY !== 'pk_test_your_clerk_publishable_key_here' &&
  PUBLISHABLE_KEY.startsWith('pk_')

// Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'monospace',
          background: '#0A0A0A',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
            <h2 style={{ marginBottom: '16px' }}>Something went wrong</h2>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#008751',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Production App component with Clerk
const ProdApp = () => {
  const [ClerkProvider, setClerkProvider] = React.useState<any>(null)
  const [App, setApp] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        setError(null)
        const clerkModule = await import('@clerk/clerk-react')
        const appModule = await import('./App.tsx')
        setClerkProvider(() => clerkModule.ClerkProvider)
        setApp(() => appModule.default)
      } catch (error) {
        console.error('Failed to load Clerk components:', error)
        setError('Failed to load authentication. Falling back to development mode.')
        // Fall back to dev mode after a delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    }
    loadComponents()
  }, [])

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace',
        background: '#0A0A0A',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
          <div>{error}</div>
          <div style={{ fontSize: '12px', marginTop: '16px', opacity: 0.7 }}>
            Reloading in development mode...
          </div>
        </div>
      </div>
    )
  }

  if (!ClerkProvider || !App) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace',
        background: '#0A0A0A',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
          <div>Loading Math.AI...</div>
        </div>
      </div>
    )
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl='/login'>
      <App />
    </ClerkProvider>
  )
}

// App loader component to handle async loading
const AppLoader = () => {
  if (isValidClerkKey) {
    return <ProdApp />
  } else {
    // Development mode without Clerk
    return <App />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppLoader />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
