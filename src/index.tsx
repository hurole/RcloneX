import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorFallback from './components/ErrorFallback';
import App from './pages/App';
import './styles/globals.css';
import './locales/i18n';
import { ThemeProvider } from 'next-themes';

Sentry.init({
  dsn: 'http://e11483402ab8482db17771a7b07cc6bb@192.168.1.10:8000/1',
  environment: 'development',
  release: process.env.APP_VERSION,
  tracesSampleRate: 1, // 1% of transactions — adjust to your needs
});

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
        </ThemeProvider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>,
  );
}
