'use client';

import React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export function ThemeSwitcher() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative flex items-center justify-between w-16 h-8 p-1 bg-gray-200 dark:bg-slate-700 rounded-full cursor-pointer transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Theme"
        >
            <div
                className={`absolute w-6 h-6 bg-white dark:bg-indigo-500 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'
                    }`}
            />
            <span className="z-10 flex items-center justify-center w-6 h-6 text-orange-400">
                <FontAwesomeIcon icon={faSun} size="xs" />
            </span>
            <span className="z-10 flex items-center justify-center w-6 h-6 text-indigo-300">
                <FontAwesomeIcon icon={faMoon} size="xs" />
            </span>
        </button>
    );
}
