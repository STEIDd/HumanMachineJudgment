import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@human-machine-judgment/ui/style.css';
import './global.css';
import App from './App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
