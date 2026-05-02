'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
    icon?: IconDefinition;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ label, error, className, containerClassName, icon, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={`space-y-1 ${containerClassName || ''}`}>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <FontAwesomeIcon icon={icon} />
                    </div>
                )}
                <input
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field w-full pr-10 transition-all ${icon ? 'pl-12' : ''} ${error ? 'border-red-500 focus:ring-red-200' : ''} ${className}`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 focus:outline-none transition-colors"
                    tabIndex={-1}
                >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
                </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default PasswordInput;
