import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CapabilitiesPage } from './pages/CapabilitiesPage'
import { NumbersPage } from './pages/NumbersPage'
import { WizardPage } from './pages/wizard/WizardPage'
import { CompanyProvider } from './state/CompanyContext'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CompanyProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/capabilities" replace />} />
            <Route path="/capabilities" element={<CapabilitiesPage />} />
            <Route path="/numbers" element={<NumbersPage />} />
          </Route>
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/wizard/:requirementId" element={<WizardPage />} />
        </Routes>
      </CompanyProvider>
    </BrowserRouter>
  )
}
