import axios from 'axios';

// En production, l'API est servie sur la même origine que l'interface.
// En développement, le port 3000 suit l'hôte pour conserver l'accès LAN.
const env = import.meta.env.VITE_API_URL as string | undefined;
const base = import.meta.env.PROD
  ? ''
  : env && !env.includes('localhost')
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
