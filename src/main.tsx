import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AuthBootstrap from './components/auth/AuthBootstrap'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthBootstrap>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthBootstrap>
  </StrictMode>,
)
