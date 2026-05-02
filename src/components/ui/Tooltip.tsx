'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export default function Tooltip({ text, children, position = 'top', delay = 300, className = '' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent',
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div className={`absolute z-[100] whitespace-nowrap px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-xl animate-in fade-in zoom-in duration-200 ${positionClasses[position]}`}>
                    {text}
                    {/* Shadow Arrow */}
                    <div className={`absolute border-4 opacity-70 ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
}

const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent',
};
