import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './pages/App';
import './styles/globals.css';
import './locales/i18n';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
