import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App'

// Auth0 Configuration
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE

// Check if we have valid Auth0 config
const isValidAuth0Config = AUTH0_DOMAIN && AUTH0_CLIENT_ID &&
  AUTH0_DOMAIN !== 'your-tenant.auth0.com' &&
  AUTH0_CLIENT_ID !== 'your-client-id'

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

// App loader component with Auth0
const AppLoader = () => {
  if (isValidAuth0Config) {
    return (
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin + '/sso-callback',
          audience: AUTH0_AUDIENCE || undefined,
        }}
        cacheLocation="localstorage"
      >
        <App />
      </Auth0Provider>
    )
  } else {
    // Development mode without Auth0
    console.warn('Auth0 not configured - running in development mode')
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
