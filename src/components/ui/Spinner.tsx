'use client';

import React from 'react';

interface SpinnerProps {
    variant?: 'rotation' | 'morph';
    className?: string;
}

export function Spinner({ variant = 'rotation', className = '' }: SpinnerProps) {
    const spinnerClass = variant === 'rotation' ? 'creative-spinner' : 'creative-spinner-morph';
    return (
        <span className={`${spinnerClass} ${className}`}></span>
    );
}
