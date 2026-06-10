import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './pages/App';
import * as Sentry from '@sentry/react';
import ErrorFallback from './components/ErrorFallback';
import './styles/globals.css';
import './locales/i18n';

Sentry.init({
  dsn: 'http://90834f8b4a8b48c6a7da90202b953dbc@192.168.1.10:8000/1',
  environment: 'development',
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.01, // 1% of transactions — adjust to your needs
});

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <App />
      </Sentry.ErrorBoundary>
    </React.StrictMode>,
  );
}
