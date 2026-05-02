'use client';

import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`modal-content ${maxWidth}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors">
                        <span className="text-xl">✕</span>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
