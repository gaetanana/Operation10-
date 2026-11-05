import axios from 'axios';

// L'URL du backend suit l'hôte par lequel on ouvre l'app :
// - sur le PC (localhost) → http://localhost:3000
// - sur le téléphone (http://192.168.x.x:5173) → http://192.168.x.x:3000
// VITE_API_URL n'est utilisé que s'il pointe ailleurs que localhost.
const env = import.meta.env.VITE_API_URL as string | undefined;
const base = env && !env.includes('localhost')
  ? env
  : `${window.location.protocol}//${window.location.hostname}:3000`;

const api = axios.create({
  baseURL: `${base}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/session')
    ) {
      window.dispatchEvent(new Event('operation10:session-expired'));
    }
    return Promise.reject(error);
  },
);

export default api;
