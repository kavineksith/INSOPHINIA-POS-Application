'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Tooltip from '@/components/ui/Tooltip';
import { hasPermission, Permission } from '@/lib/permissions';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartBar, faCashRegister, faFileInvoice, faBox,
    faTags, faWarehouse, faUsers, faBullhorn,
    faChartLine, faUserShield, faCog, faSignOutAlt, faFileAlt,
    faArrowRight, faArrowLeft, faBars, faTimes, faShoppingCart, faShieldAlt, faDatabase
} from '@fortawesome/free-solid-svg-icons';

const navItems: { href: string; label: string; icon: React.ReactNode; permission: Permission }[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <FontAwesomeIcon icon={faChartBar} />, permission: 'view:dashboard' },
    { href: '/billing', label: 'Billing', icon: <FontAwesomeIcon icon={faCashRegister} />, permission: 'view:billing' },
    { href: '/bills', label: 'Bills', icon: <FontAwesomeIcon icon={faFileInvoice} />, permission: 'view:billing' },
    { href: '/items', label: 'Items', icon: <FontAwesomeIcon icon={faBox} />, permission: 'view:items' },
    { href: '/categories', label: 'Categories', icon: <FontAwesomeIcon icon={faTags} />, permission: 'view:categories' },
    { href: '/inventory', label: 'Inventory', icon: <FontAwesomeIcon icon={faWarehouse} />, permission: 'view:inventory' },
    { href: '/customers', label: 'Customers', icon: <FontAwesomeIcon icon={faUsers} />, permission: 'view:customers' },
    { href: '/promotions', label: 'Promotions', icon: <FontAwesomeIcon icon={faBullhorn} />, permission: 'view:promotions' },
    { href: '/reports', label: 'Reports', icon: <FontAwesomeIcon icon={faChartLine} />, permission: 'view:reports' },
    { href: '/users', label: 'Users', icon: <FontAwesomeIcon icon={faUserShield} />, permission: 'view:users' },
    { href: '/settings', label: 'Settings', icon: <FontAwesomeIcon icon={faCog} />, permission: 'view:settings' },
    { href: '/security', label: 'Security', icon: <FontAwesomeIcon icon={faShieldAlt} />, permission: 'view:security' },
    { href: '/backups', label: 'Backups', icon: <FontAwesomeIcon icon={faDatabase} />, permission: 'view:settings' },
    { href: '/logs', label: 'System Logs', icon: <FontAwesomeIcon icon={faFileAlt} />, permission: 'view:logs' },
];


export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const tooltipPos = "top";

    const filteredNav = navItems.filter(item => {
        if (!user?.role) return false;
        return hasPermission(user.role, item.permission);
    });

    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white shadow-lg lg:hidden border border-gray-200 text-indigo-600 transition-all hover:scale-110 active:scale-95"
                aria-label="Toggle menu"
            >
                <FontAwesomeIcon icon={isMobileOpen ? faTimes : faBars} className="text-xl" />
            </button>

            {/* Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-500 ease-in-out flex flex-col shadow-xl lg:shadow-none
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="p-6 border-b border-gray-100/50 flex items-center justify-between">
                    <Tooltip text="INSOPHINIA POS" position="bottom">
                        <div className="flex items-center gap-3 group transition-all">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform duration-300 border border-white/50">
                                <img src="/insophinia_logo.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            {!isCollapsed && (
                                <div className="min-w-0">
                                    <h1 className="font-extrabold text-gray-900 leading-tight tracking-tight text-lg">INSOPHINIA</h1>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Premium POS</p>
                                </div>
                            )}
                        </div>
                    </Tooltip>

                    {/* Mobile Close Button inside Sidebar */}
                    {isMobileOpen && (
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="lg:hidden w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
                    {filteredNav.map(item => {
                        const isActive = pathname === item.href;
                        return (
                            <Tooltip key={item.href} text={item.label} position={item.label === 'Dashboard' ? 'bottom' : tooltipPos} delay={300} className="w-full">
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group w-full
                                        ${isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                            : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                                        }`}
                                >
                                    <span className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </span>
                                    {!isCollapsed && (
                                        <span className={`font-bold text-sm tracking-wide ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-indigo-600'}`}>
                                            {item.label}
                                        </span>
                                    )}
                                    {isActive && !isCollapsed && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40" />
                                    )}
                                </Link>
                            </Tooltip>
                        );
                    })}
                </nav>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100/50">
                    {!isCollapsed && user && (
                        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase text-xs">
                                {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">{user.role}</p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Tooltip text="Logout from session" position={tooltipPos}>
                            <button
                                onClick={logout}
                                className="flex items-center gap-4 w-full px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group font-semibold text-sm"
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} className="text-lg group-hover:rotate-12 transition-transform" />
                                {!isCollapsed && <span>Logout</span>}
                            </button>
                        </Tooltip>

                        <Tooltip text={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} position={tooltipPos}>
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="hidden lg:flex items-center gap-4 w-full px-4 py-3 rounded-2xl text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-semibold text-sm relative group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <FontAwesomeIcon icon={isCollapsed ? faArrowRight : faArrowLeft} className="text-sm transition-transform group-hover:scale-110" />
                                </div>
                                {!isCollapsed && <span>Collapse Menu</span>}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </aside>

            {/* Spacer */}
            <div className={`hidden lg:block flex-shrink-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`} />
        </>
    );
}
