import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Global ResizeObserver Error Suppression
// Intercepta e silencia completamente os warnings do ResizeObserver
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filtra especificamente os erros do ResizeObserver
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('ResizeObserver loop completed with undelivered notifications') ||
       message.includes('ResizeObserver loop limit exceeded'))) {
    return; // Silencia completamente
  }
  originalConsoleError.apply(console, args);
};

// Intercepta erros globais relacionados ao ResizeObserver
window.addEventListener('error', (event) => {
  if (event.message && 
      (event.message.includes('ResizeObserver') ||
       event.message.includes('loop completed with undelivered notifications'))) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Intercepta erros não capturados relacionados ao ResizeObserver
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message &&
      (event.reason.message.includes('ResizeObserver') ||
       event.reason.message.includes('loop completed with undelivered notifications'))) {
    event.preventDefault();
    return false;
  }
});

// Polyfill robusto para ResizeObserver
if (typeof window !== 'undefined' && window.ResizeObserver) {
  const OriginalResizeObserver = window.ResizeObserver;
  
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      const wrappedCallback = (entries, observer) => {
        try {
          // Usa requestAnimationFrame para evitar loops
          requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (error) {
              // Silencia erros do ResizeObserver
              if (!error.message || !error.message.includes('ResizeObserver')) {
                throw error;
              }
            }
          });
        } catch (error) {
          // Silencia erros do ResizeObserver
          if (!error.message || !error.message.includes('ResizeObserver')) {
            throw error;
          }
        }
      };
      
      super(wrappedCallback);
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
