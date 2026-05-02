'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import NotificationCenter from '@/components/layout/NotificationCenter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <Spinner variant="rotation" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-transparent relative">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-6 overflow-auto pt-20 lg:pt-6">
                <div className="max-w-7xl mx-auto">
                    <div className="hidden lg:flex items-center justify-between mb-6">
                        <Breadcrumbs />
                        <div className="flex items-center gap-4">
                            <NotificationCenter />
                        </div>
                    </div>
                    {/* Mobile Breadcrumbs (since toggle is top-left) */}
                    <div className="lg:hidden mb-4">
                        <Breadcrumbs />
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
