import { Navigate, Outlet } from 'react-router-dom';

const ROLE_HOME = {
  admin: '/',
  doctor: '/physician',
  nurse: '/nurse',
  technician: '/technician',
  reception: '/reception',
  receptionist: '/reception',
};

const ROUTE_ROLES = {
  '/reception': ['reception', 'receptionist', 'admin'],
  '/nurse': ['nurse', 'admin'],
  '/technician': ['technician', 'admin'],
  '/physician': ['doctor', 'admin'],
  '/admin/users': ['admin'],
  '/admin/logs': ['admin'],
  '/clinic/green': ['doctor', 'admin', 'reception', 'receptionist'],
  '/clinic/red': ['doctor', 'admin', 'reception', 'receptionist'],
  '/scans': ['doctor', 'admin', 'reception', 'receptionist', 'technician', 'nurse'],
};

const matchRouteRule = (pathname) => {
  if (pathname.startsWith('/scans')) return ROUTE_ROLES['/scans'];
  const key = Object.keys(ROUTE_ROLES).find((k) => pathname === k || pathname.startsWith(`${k}/`));
  return key ? ROUTE_ROLES[key] : null;
};

const RoleRouteGuard = () => {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) return <Navigate to="/login" replace />;
  const user = JSON.parse(userStr);
  const pathname = window.location.pathname;
  const allowed = matchRouteRule(pathname);

  if (allowed && !allowed.includes(user.role)) {
    const home = ROLE_HOME[user.role] || '/';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
};

export default RoleRouteGuard;
