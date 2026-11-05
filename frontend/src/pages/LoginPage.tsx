import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: () => api.post('/auth/login', { password }),
    onSuccess: () => {
      setPassword('');
      onLogin();
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length > 0) login.mutate();
  };

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-icon login-icon"><i className="ti ti-flame" /></div>
        <p className="brand-sub">TON ESPACE PERSONNEL</p>
        <h1 className="page-title">Content de te revoir</h1>
        <p className="page-sub">Entre ton mot de passe pour retrouver ton suivi.</p>
        <form onSubmit={submit}>
          <label className="login-label" htmlFor="owner-password">Mot de passe</label>
          <input
            id="owner-password"
            className="food-input"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            maxLength={256}
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          {login.isError && (
            <p className="login-error" role="alert">
              {login.error instanceof Error && 'response' in login.error
                ? 'Mot de passe incorrect ou trop de tentatives. Réessaie dans un instant.'
                : 'La connexion a échoué. Vérifie que le serveur est disponible.'}
            </p>
          )}
          <button className="food-btn login-submit" type="submit" disabled={login.isPending || !password}>
            {login.isPending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="login-footnote">Accès privé · aucune inscription publique</p>
      </section>
    </main>
  );
}
