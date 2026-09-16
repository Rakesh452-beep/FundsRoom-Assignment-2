import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((type, message) => {
    const id = ++seq;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const toast = useCallback({
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  }, [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[280px] max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-[fadeIn_.2s] ${
              t.type === 'success' ? 'bg-emerald-600 text-white'
              : t.type === 'error' ? 'bg-rose-600 text-white'
              : 'bg-slate-800 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}