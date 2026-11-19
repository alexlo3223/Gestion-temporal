import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { store } from './store/store';
import './styles/main.css';

const root = document.getElementById('root');
if (!root) throw new Error('Falta el elemento #root en index.html');

store.persist(); // la primera vez guarda los datos de muestra
void store.loadRemote();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
