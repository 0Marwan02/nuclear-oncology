import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RoleRouteGuard from './components/RoleRouteGuard';
import GlobalSearch from './components/GlobalSearch';
import Login from './pages/Login';
import PatientsList from './pages/PatientsList';
import PatientProfile from './pages/PatientProfile';
import PatientHistory from './pages/PatientHistory';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import AdminLogs from './pages/AdminLogs';
import ReceptionDashboard from './pages/ReceptionDashboard';
import NurseDashboard from './pages/NurseDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import PhysicianDashboard from './pages/PhysicianDashboard';
import ClinicGreenFile from './pages/ClinicGreenFile';
import ClinicRedFile from './pages/ClinicRedFile';
import ScansList from './pages/ScansList';
import ScanPETCT from './pages/ScanPETCT';
import ScanPSMA from './pages/ScanPSMA';
import ScanThyroid from './pages/ScanThyroid';
import ScanBone from './pages/ScanBone';
import ScanRenal from './pages/ScanRenal';
import ScanGastric from './pages/ScanGastric';
import ScanMeckel from './pages/ScanMeckel';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <GlobalSearch />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes Wrapper */}
        <Route path="/" element={<Layout />}>
          <Route element={<RoleRouteGuard />}>
          <Route index element={<Dashboard />} />
          <Route path="reception" element={<ReceptionDashboard />} />
          <Route path="nurse" element={<NurseDashboard />} />
          <Route path="technician" element={<TechnicianDashboard />} />
          <Route path="physician" element={<PhysicianDashboard />} />
          <Route path="patients" element={<PatientsList />} />
          <Route path="patients/:id" element={<PatientProfile />} />
          <Route path="patients/:id/history" element={<PatientHistory />} />
          <Route path="clinic/green" element={<ClinicGreenFile />} />
          <Route path="clinic/red" element={<ClinicRedFile />} />
          <Route path="scans" element={<ScansList />} />
          <Route path="scans/petct" element={<ScanPETCT />} />
          <Route path="scans/psma" element={<ScanPSMA />} />
          <Route path="scans/thyroid" element={<ScanThyroid />} />
          <Route path="scans/bone" element={<ScanBone />} />
          <Route path="scans/renal" element={<ScanRenal />} />
          <Route path="scans/gastric" element={<ScanGastric />} />
          <Route path="scans/meckel" element={<ScanMeckel />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/logs" element={<AdminLogs />} />
          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
