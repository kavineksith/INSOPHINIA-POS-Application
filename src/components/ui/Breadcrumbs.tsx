'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faHome } from '@fortawesome/free-solid-svg-icons';

export default function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split('/').filter(p => p);

    return (
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors flex items-center">
                <FontAwesomeIcon icon={faHome} className="mr-1" />
                <span>Home</span>
            </Link>

            {paths.map((path, index) => {
                const isLast = index === paths.length - 1;
                const href = `/${paths.slice(0, index + 1).join('/')}`;
                const label = path === 'dashboard' ? null : path.charAt(0).toUpperCase() + path.slice(1);

                if (!label) return null;

                return (
                    <React.Fragment key={href}>
                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] text-gray-300" />
                        {isLast ? (
                            <span className="font-semibold text-gray-900">{label}</span>
                        ) : (
                            <Link href={href} className="hover:text-indigo-600 transition-colors underline-offset-4 hover:underline">
                                {label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
