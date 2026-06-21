import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'

const AppLayout = lazy(() => import('./components/layout/AppLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'))
const EntityPage = lazy(() => import('./pages/EntityPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPrototype = lazy(() => import('./pages/DashboardPrototype'))
const GraphPage = lazy(() => import('./pages/GraphPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const ArchivePage = lazy(() => import('./pages/ArchivePage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

function RouteFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-secondary)',
      fontFamily: 'var(--font-ui)',
      fontSize: 15,
    }}
    >
      Lädt…
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={(
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<DashboardPrototype />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="/entities/:id" element={<EntityPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/:categorySlug" element={<Dashboard />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
