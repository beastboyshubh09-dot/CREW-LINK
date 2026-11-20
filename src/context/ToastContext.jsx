import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);
  return <ToastContext.Provider value={toast}>{children}<div className="fixed right-4 top-4 z-[1000] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{toasts.map((item) => <div key={item.id} role="status" className={`rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-xl ${item.tone === 'error' ? 'bg-rose-700' : 'bg-forest-800'}`}>{item.message}</div>)}</div></ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);