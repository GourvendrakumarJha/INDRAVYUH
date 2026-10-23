import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SosProvider } from './context/SosContext';
import { MotionController } from './components/MotionController';
import { PublicLayout } from './components/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WelfareLayout } from './components/WelfareLayout';
import { BusinessLayout } from './components/BusinessLayout';
import { EmployeeLayout } from './components/EmployeeLayout';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import HelpPage from './pages/HelpPage';
import MapPage from './pages/MapPage';
import AlertsPage from './pages/AlertsPage';
import SheltersPage from './pages/SheltersPage';
import FamilySafetyPage from './components/FamilySafety';
import PreparednessPage from './pages/PreparednessPage';
import TrackPage from './pages/TrackPage';
import AboutPage from './pages/AboutPage';
import AccessPage from './pages/AccessPage';
import PortalLoginPage from './pages/PortalLoginPage';
import WelfareDashboard from './pages/WelfareDashboard';
import BusinessDashboard from './pages/BusinessDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import NotFoundPage from './pages/NotFoundPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

export default function App() {
  return <LanguageProvider><ThemeProvider><AuthProvider><BrowserRouter><ScrollToTop /><MotionController /><Routes>
    <Route element={<SosProvider><PublicLayout /></SosProvider>}>
      <Route index element={<HomePage />} />
      <Route path="report" element={<ReportPage />} />
      <Route path="help" element={<HelpPage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="shelters" element={<SheltersPage />} />
      <Route path="family-safety" element={<FamilySafetyPage />} />
      <Route path="preparedness" element={<PreparednessPage />} />
      <Route path="track" element={<TrackPage />} />
      <Route path="about" element={<AboutPage />} />
    </Route>
    <Route path="access" element={<AccessPage />} />
    <Route path="portals/:portal" element={<PortalLoginPage />} />
    <Route path="welfare" element={<ProtectedRoute portal="welfare"><WelfareLayout /></ProtectedRoute>}>
      <Route index element={<WelfareDashboard />} /><Route path=":section" element={<WelfareDashboard />} />
    </Route>
    <Route path="business" element={<ProtectedRoute portal="business"><BusinessLayout /></ProtectedRoute>}>
      <Route index element={<BusinessDashboard />} /><Route path=":section" element={<BusinessDashboard />} />
    </Route>
    <Route path="employee" element={<ProtectedRoute portal="employee"><EmployeeLayout /></ProtectedRoute>}>
      <Route index element={<EmployeeDashboard />} /><Route path=":section" element={<EmployeeDashboard />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter></AuthProvider></ThemeProvider></LanguageProvider>;
}
