'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    let nextId = 0;

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' && '✓ '}
                        {toast.type === 'error' && '✕ '}
                        {toast.type === 'warning' && '⚠ '}
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
