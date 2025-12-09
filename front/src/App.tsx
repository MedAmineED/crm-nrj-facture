// App.tsx
import { BrowserRouter } from 'react-router-dom';
import Router from './router/Router';
import { AuthProvider } from './hooks/useAuth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  );
}