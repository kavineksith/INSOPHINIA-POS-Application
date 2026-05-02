'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faExclamationTriangle, faInfoCircle, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useApi } from '@/hooks/useApi';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'info' | 'success';
    time: string;
    isRead: boolean;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { apiFetch } = useApi();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const res = await apiFetch('/api/dashboard');
            if (res.success) {
                const mockNotifications: Notification[] = [];

                // Low stock alerts
                if (res.data.low_stock_items > 0) {
                    mockNotifications.push({
                        id: 'low-stock',
                        title: 'Low Stock Alert',
                        message: `${res.data.low_stock_items} items are running low on stock.`,
                        type: 'warning',
                        time: 'Just now',
                        isRead: false
                    });
                }

                if (res.data.out_of_stock_items > 0) {
                    mockNotifications.push({
                        id: 'out-of-stock',
                        title: 'Out of Stock!',
                        message: `${res.data.out_of_stock_items} items are completely out of stock.`,
                        type: 'warning',
                        time: 'Just now',
                        isRead: false
                    });
                }

                // Generic Welcome
                mockNotifications.push({
                    id: 'welcome',
                    title: 'System Ready',
                    message: 'POS System is online and backup is configured.',
                    type: 'success',
                    time: '5m ago',
                    isRead: true
                });

                setNotifications(mockNotifications);
                setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
            }
        };

        fetchNotifications();

        // Handle clicks outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [apiFetch]);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const removeNotification = (id: string) => {
        const updated = notifications.filter(n => n.id !== id);
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.isRead).length);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all duration-200 ${isOpen ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-indigo-600 shadow-sm border border-gray-100'}`}
                aria-label="Notifications"
            >
                <FontAwesomeIcon icon={faBell} className="text-xl" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-bold">{unreadCount} New</span>}
                        </h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-2xl" />
                                </div>
                                <p className="text-gray-500 text-sm">All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div key={notif.id} className={`p-4 flex gap-3 transition-colors ${notif.isRead ? 'bg-white' : 'bg-indigo-50/30'}`}>
                                        <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                            notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            <FontAwesomeIcon icon={notif.type === 'warning' ? faExclamationTriangle : notif.type === 'success' ? faCheckCircle : faInfoCircle} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-bold text-gray-800 truncate">{notif.title}</p>
                                                <button onClick={() => removeNotification(notif.id)} className="text-gray-300 hover:text-gray-500 p-1">
                                                    <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">{notif.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
