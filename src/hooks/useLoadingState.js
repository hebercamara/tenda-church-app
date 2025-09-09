import { useState } from 'react';

/**
 * Hook personalizado para gerenciar estados de loading
 * @param {string} initialState - Estado inicial (idle, loading, success, error)
 * @returns {object} - Objeto com estado atual e funções de controle
 */
export const useLoadingState = (initialState = 'idle') => {
  const [state, setState] = useState(initialState);
  const [message, setMessage] = useState('');

  const setLoading = (loadingMessage = '') => {
    setState('loading');
    setMessage(loadingMessage);
  };

  const setSuccess = (successMessage = '') => {
    setState('success');
    setMessage(successMessage);
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      setState('idle');
      setMessage('');
    }, 3000);
  };

  const setError = (errorMessage = '') => {
    setState('error');
    setMessage(errorMessage);
    // Auto-clear error message after 5 seconds
    setTimeout(() => {
      setState('idle');
      setMessage('');
    }, 5000);
  };

  const setIdle = () => {
    setState('idle');
    setMessage('');
  };

  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';
  const isIdle = state === 'idle';

  return {
    state,
    message,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    setLoading,
    setSuccess,
    setError,
    setIdle
  };
};

/**
 * Hook para múltiplos loading states
 * @param {Array<string>} operations - Lista de operações para rastrear
 * @returns {object} - Objeto com estados e funções para cada operação
 */
export const useMultipleLoadingStates = (operations = []) => {
  const [states, setStates] = useState(
    operations.reduce((acc, op) => ({ ...acc, [op]: 'idle' }), {})
  );
  const [messages, setMessages] = useState(
    operations.reduce((acc, op) => ({ ...acc, [op]: '' }), {})
  );

  const setOperationState = (operation, state, message = '') => {
    setStates(prev => ({ ...prev, [operation]: state }));
    setMessages(prev => ({ ...prev, [operation]: message }));

    // Auto-clear success/error states
    if (state === 'success' || state === 'error') {
      const timeout = state === 'success' ? 3000 : 5000;
      setTimeout(() => {
        setStates(prev => ({ ...prev, [operation]: 'idle' }));
        setMessages(prev => ({ ...prev, [operation]: '' }));
      }, timeout);
    }
  };

  const setLoading = (operation, message = '') => 
    setOperationState(operation, 'loading', message);
  
  const setSuccess = (operation, message = '') => 
    setOperationState(operation, 'success', message);
  
  const setError = (operation, message = '') => 
    setOperationState(operation, 'error', message);
  
  const setIdle = (operation) => 
    setOperationState(operation, 'idle', '');

  const isLoading = (operation) => states[operation] === 'loading';
  const isSuccess = (operation) => states[operation] === 'success';
  const isError = (operation) => states[operation] === 'error';
  const isIdle = (operation) => states[operation] === 'idle';

  const getState = (operation) => states[operation];
  const getMessage = (operation) => messages[operation];

  return {
    states,
    messages,
    setLoading,
    setSuccess,
    setError,
    setIdle,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    getState,
    getMessage
  };
};