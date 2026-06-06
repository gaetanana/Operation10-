import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const today = new Date().toISOString().split('T')[0];

export default function TodoPage() {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'daily' | 'stage'>('daily');

  const { data: todos = [] } = useQuery({
    queryKey: ['todos', today],
    queryFn: () => api.get(`/todo?date=${today}`).then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/todo/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const add = useMutation({
    mutationFn: (data: any) => api.post('/todo', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      setNewTitle('');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/todo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    add.mutate({ title: newTitle.trim(), category: newCategory, dueDate: today });
  };

  const daily = todos.filter((t: any) => t.category === 'daily');
  const stage = todos.filter((t: any) => t.category === 'stage');
  const done  = todos.filter((t: any) => t.completed).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Todo du jour</h1>
          <p className="page-sub">{done} / {todos.length} complétées · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Formulaire ajout */}
      <div className="add-food" style={{ marginBottom: 20 }}>
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value as any)}
          className="food-input"
          style={{ maxWidth: 130, cursor: 'pointer' }}
        >
          <option value="daily">Quotidien</option>
          <option value="stage">Stage</option>
        </select>
        <input
          className="food-input"
          placeholder="Nouvelle tâche…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="food-btn" onClick={handleAdd}>Ajouter</button>
      </div>

      <div className="cols-2">
        <div>
          <p className="section-head">Quotidien</p>
          <div className="card">
            {daily.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune tâche quotidienne.</p>}
            {daily.map((t: any) => (
              <div key={t.id} className="todo-item">
                <div className={`cb${t.completed ? ' done' : ''}`} onClick={() => toggle.mutate(t.id)} />
                <span className={`todo-text${t.completed ? ' done' : ''}`}>{t.title}</span>
                <span className="pill pill-green">Quotidien</span>
                <button onClick={() => remove.mutate(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, marginLeft: 4 }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="section-head">Stage / Formation</p>
          <div className="card">
            {stage.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune tâche de stage.</p>}
            {stage.map((t: any) => (
              <div key={t.id} className="todo-item">
                <div className={`cb${t.completed ? ' done' : ''}`} onClick={() => toggle.mutate(t.id)} />
                <span className={`todo-text${t.completed ? ' done' : ''}`}>{t.title}</span>
                <span className="pill pill-blue">Stage</span>
                <button onClick={() => remove.mutate(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, marginLeft: 4 }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
