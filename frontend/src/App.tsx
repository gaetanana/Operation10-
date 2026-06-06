import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TodoPage from './pages/TodoPage';
import SportPage from './pages/SportPage';
import NutritionPage from './pages/NutritionPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/todo" replace />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/sport" element={<SportPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  );
}
