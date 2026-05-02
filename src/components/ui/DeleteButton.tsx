'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface DeleteButtonProps {
    onDelete: () => Promise<void> | void;
    confirmMessage?: string;
    className?: string;
    label?: string;
    variant?: 'icon' | 'full';
}

export default function DeleteButton({
    onDelete,
    confirmMessage = 'Are you sure you want to delete this item?',
    className = '',
    label = 'Delete',
    variant = 'icon'
}: DeleteButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        try {
            setIsDeleting(true);
            await onDelete();
        } finally {
            setIsDeleting(false);
            setIsConfirming(false);
        }
    };

    if (variant === 'full') {
        return (
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                onMouseLeave={() => !isDeleting && setIsConfirming(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${isConfirming
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    } ${className}`}
            >
                <FontAwesomeIcon icon={isDeleting ? faSpinner : (isConfirming ? faExclamationTriangle : faTrash)} className={isDeleting ? 'animate-spin' : ''} />
                {isDeleting ? 'Deleting...' : (isConfirming ? 'Confirm?' : label)}
            </button>
        );
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            onMouseLeave={() => !isDeleting && setIsConfirming(false)}
            title={isConfirming ? 'Click again to confirm' : label}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isConfirming
                    ? 'bg-red-600 text-white scale-110 shadow-lg'
                    : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'
                } ${className}`}
        >
            <FontAwesomeIcon icon={isDeleting ? faSpinner : (isConfirming ? faExclamationTriangle : faTrash)} className={isDeleting ? 'animate-spin' : ''} />
        </button>
    );
}
