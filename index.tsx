
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Inicialização automática do Telegram Mini App SDK
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  try {
    const tg = (window as any).Telegram.WebApp;
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) {
      tg.setHeaderColor('#0f172a'); // Cor de fundo do cabeçalho Telegram combinando com o tema escuro
    }
  } catch (e) {
    console.warn("Telegram WebApp init warning:", e);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

