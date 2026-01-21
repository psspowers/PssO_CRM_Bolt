/**
 * PSS Orange CRM - Main Entry Point
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  if (event.error?.message?.includes('ResizeObserver') ||
      event.error?.message?.includes('Script error')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
