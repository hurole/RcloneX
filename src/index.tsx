import { ThemeProvider } from 'next-themes';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';
import './styles/globals.css';
import './locales/i18n';
import App from './pages/App';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
