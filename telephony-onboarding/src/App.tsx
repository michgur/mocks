import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { NumbersPage } from './pages/NumbersPage'
import { WizardPage } from './pages/wizard/WizardPage'
import { EntityProvider } from './state/EntityContext'

export default function App() {
  return (
    <BrowserRouter>
      <EntityProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/numbers" replace />} />
            <Route path="/numbers" element={<NumbersPage />} />
            <Route path="/registration" element={<DashboardPage />} />
          </Route>
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/wizard/:capabilityId" element={<WizardPage />} />
        </Routes>
      </EntityProvider>
    </BrowserRouter>
  )
}
