import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/public/LandingPage';
import AuthPage from './pages/public/AuthPage';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './routes/ProtectedRoute';

const RequesterApp = lazy(() => import('./pages/requester/RequesterApp'));
const WorkerApp = lazy(() => import('./pages/worker/WorkerApp'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

function PageFallback() { return <div className="min-h-64 animate-pulse rounded-xl bg-white" aria-label="Loading workspace"/>; }

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-canvas" />;
  if (!user) return <LandingPage />;
  return <Navigate to={`/app/${user.role}`} replace />;
}

function WorkspacePlaceholder() {
  const { user } = useAuth();
  return <section className="rounded-xl border border-emerald-100 bg-white p-8 shadow-lift"><p className="text-sm font-bold uppercase tracking-wider text-forest-600">{user?.role} workspace</p><h1 className="mt-2 font-display text-3xl font-extrabold">Your local work, in motion.</h1><p className="mt-3 max-w-xl text-slate-600">This workspace is ready. Job and crew tools are loading into this area next.</p></section>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="requester/*" element={<ProtectedRoute roles={['requester']}><Suspense fallback={<PageFallback/>}><RequesterApp /></Suspense></ProtectedRoute>} />
          <Route path="worker/*" element={<ProtectedRoute roles={['worker']}><Suspense fallback={<PageFallback/>}><WorkerApp /></Suspense></ProtectedRoute>} />
          <Route path="admin/*" element={<ProtectedRoute roles={['admin']}><Suspense fallback={<PageFallback/>}><AdminApp /></Suspense></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}