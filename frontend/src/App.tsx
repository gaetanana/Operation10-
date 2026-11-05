import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SeanceDuJourPage from './pages/SeanceDuJourPage';
import SportPage from './pages/SportPage';
import NutritionPage from './pages/NutritionPage';
import RevisionPage from './pages/RevisionPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/seance" element={<SeanceDuJourPage />} />
          <Route path="/sport" element={<SportPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/revision" element={<RevisionPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
