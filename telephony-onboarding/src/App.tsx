import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CapabilitiesPage } from './pages/CapabilitiesPage'
import { SourcesPage } from './pages/SourcesPage'
import { AlertsPage } from './pages/AlertsPage'
import { NumbersPage } from './pages/NumbersPage'
import { WizardPage } from './pages/wizard/WizardPage'
import { CompanyProvider } from './state/CompanyContext'

export default function App() {
  return (
    <HashRouter>
      <CompanyProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/numbers" replace />} />
            <Route path="/capabilities" element={<CapabilitiesPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/numbers" element={<NumbersPage />} />
          </Route>
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/wizard/:requirementId" element={<WizardPage />} />
        </Routes>
      </CompanyProvider>
    </HashRouter>
  )
}
