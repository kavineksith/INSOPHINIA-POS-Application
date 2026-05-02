'use client';

import React from 'react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NotificationCenter from './NotificationCenter';

export default function Header() {
    return (
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 mb-6 sticky top-0 bg-white z-30 transition-all duration-300 border-b border-gray-200 px-4 -mx-4">
            <div className="flex-1">
                <Breadcrumbs />
            </div>
            <div className="flex items-center gap-3">
                <NotificationCenter />
            </div>
        </header>
    );
}
