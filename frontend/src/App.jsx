import { Routes, Route, Link as RouterLink, useNavigate } from 'react-router-dom'
import HomeList from './pages/HomeList.jsx'
import HomeDetail from './pages/HomeDetail.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Auth from './pages/Auth.jsx'
import SideNavLayout from './layouts/SideNavLayout.jsx'
import { Navigate } from 'react-router-dom'
import HomeDocuments from './pages/HomeDocuments.jsx'
import HomeContacts from './pages/HomeContacts.jsx'
import HomeSchedule from './pages/HomeSchedule.jsx'
import HomeTrades from './pages/HomeTrades.jsx'
import HomeBidDetail from './pages/HomeBidDetail.jsx'
import HomeBudget from './pages/HomeBudget.jsx'
import HomeDashboard from './pages/HomeDashboard.jsx'
import Templates from './pages/Templates.jsx'
import HomeMessages from './pages/HomeMessages.jsx'
import TemplateEditor from './pages/TemplateEditor.jsx'
import Terms from './pages/Terms.jsx'
import Account from './pages/Account.jsx'
import HomePlanning from './pages/HomePlanning.jsx'
import HomeTools from './pages/HomeTools.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<SideNavLayout />}>
        <Route path="/account" element={<Account />} />
        <Route path="/homes" element={<HomeList />} />
        <Route path="/homes/:id" element={<Navigate to="dashboard" replace />} />
        <Route path="/homes/:id/dashboard" element={<HomeDashboard />} />
        <Route path="/homes/:id/planning" element={<HomePlanning />} />
        <Route path="/homes/:id/tools" element={<HomeTools />} />
        <Route path="/homes/:id/:phase" element={<HomeDetail />} />
        <Route path="/homes/:id/trades" element={<HomeTrades />} />
        <Route path="/homes/:id/trades/:bidId" element={<HomeBidDetail />} />
        <Route path="/homes/:id/documents" element={<HomeDocuments />} />
        <Route path="/homes/:id/contacts" element={<HomeContacts />} />
        <Route path="/homes/:id/schedule" element={<HomeSchedule />} />
        <Route path="/homes/:id/budget" element={<HomeBudget />} />
        <Route path="/homes/:id/messages" element={<HomeMessages />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/:id" element={<TemplateEditor />} />
      </Route>
    </Routes>
  )
}

export default App


