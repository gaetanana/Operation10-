import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SeanceDuJourPage from './pages/SeanceDuJourPage';
import LoginPage from './pages/LoginPage';
import TodoPage from './pages/TodoPage';
import SportPage from './pages/SportPage';
import NutritionPage from './pages/NutritionPage';
import StatsPage from './pages/StatsPage';
import api from './services/api';

export default function App() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const expireSession = () => {
      queryClient.clear();
      queryClient.setQueryData(['auth', 'session'], { authenticated: false });
    };
    window.addEventListener('operation10:session-expired', expireSession);
    return () => window.removeEventListener('operation10:session-expired', expireSession);
  }, [queryClient]);

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: () => api.get('/auth/session').then(response => response.data),
    retry: false,
    staleTime: 60_000,
  });
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(['auth', 'session'], { authenticated: false });
    },
  });

  if (session.isLoading) {
    return <div className="auth-status" role="status">Chargement de ta session…</div>;
  }

  const status = (session.error as AxiosError | null)?.response?.status;
  if (session.isError && status !== 401) {
    return (
      <div className="auth-status" role="alert">
        <p>Impossible de joindre l’application. Vérifie ta connexion puis réessaie.</p>
        <button className="food-btn" onClick={() => session.refetch()}>Réessayer</button>
      </div>
    );
  }

  if (!session.data?.authenticated) {
    return <LoginPage onLogin={() => session.refetch()} />;
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">Aller au contenu</a>
      <Sidebar onLogout={() => logout.mutate()} loggingOut={logout.isPending} />
      <main className="app-main" id="main-content" tabIndex={-1}>
        {logout.isError && <div role="alert" className="feedback-error">La déconnexion a échoué. Réessaie depuis le menu.</div>}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/seance" element={<SeanceDuJourPage />} />
          <Route path="/sport" element={<SportPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/revision/*" element={<Navigate to="/" replace />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
