'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCoins, faChartLine, faBox, faUsers,
    faExclamationTriangle, faBan, faTags,
    faUndo, faTimesCircle, faChevronLeft, faChevronRight,
    faSync
} from '@fortawesome/free-solid-svg-icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
    const { apiFetch } = useApi();
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Pagination for recent bills
    const [bills, setBills] = useState<unknown[]>([]);
    const [loadingBills, setLoadingBills] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch dashboard stats (relies on /api/dashboard)
    const fetchStats = React.useCallback(() => {
        setLoadingStats(true);
        apiFetch('/api/dashboard')
            .then(res => { if (res.success) setStats(res.data); })
            .catch(console.error)
            .finally(() => setLoadingStats(false));
    }, [apiFetch]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Fetch paginated bills table
    const fetchBills = React.useCallback(() => {
        setLoadingBills(true);
        apiFetch(`/api/billing?page=${page}&limit=${limit}`)
            .then(res => {
                if (res.success) {
                    setBills(res.data);
                    setTotalPages(res.pagination.pages);
                }
            })
            .catch(console.error)
            .finally(() => setLoadingBills(false));
    }, [apiFetch, page, limit]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    if (loadingStats) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton width={200} height={32} />
                        <Skeleton width={300} height={16} />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton width={40} height={40} className="rounded-xl" />
                        <Skeleton width={100} height={40} className="rounded-xl" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={120} className="rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton height={300} className="lg:col-span-2 rounded-xl" />
                    <Skeleton height={300} className="rounded-xl" />
                </div>
            </div>
        );
    }

    const s = stats || {};
    const role = user?.role || 'cashier';

    // RBAC Helpers
    const isAdmin = role === 'admin';
    const isSupervisorOrAbove = role === 'admin' || role === 'supervisor';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.first_name || 'User'}! Here&apos;s your business overview.</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="btn-secondary w-10 h-10 rounded-xl flex items-center justify-center hover:rotate-180 transition-all duration-500"
                    title="Refresh Stats"
                >
                    <FontAwesomeIcon icon={faSync} className={loadingStats ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card card-green">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Today&apos;s Sales</p>
                            <p className="text-2xl font-bold mt-1">Rs. {Number(s?.today_sales || 0).toLocaleString()}</p>
                            <p className="text-xs opacity-80 mt-1">{Number(s?.today_bills || 0)} bills</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center text-xl"><FontAwesomeIcon icon={faCoins} /></div>
                    </div>
                </div>

                <div className="stat-card card-teal">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Weekly Sales</p>
                            <p className="text-2xl font-bold mt-1">Rs. {Number(s?.week_sales || 0).toLocaleString()}</p>
                            <p className="text-xs opacity-80 mt-1">{Number(s?.week_bills || 0)} bills</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center text-xl"><FontAwesomeIcon icon={faChartLine} /></div>
                    </div>
                </div>

                {isSupervisorOrAbove && (
                    <div className="stat-card card-blue">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Monthly Sales</p>
                                <p className="text-2xl font-bold mt-1">Rs. {Number(s?.month_sales || 0).toLocaleString()}</p>
                                <p className="text-xs opacity-80 mt-1">{Number(s?.month_bills || 0)} bills</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center text-xl"><FontAwesomeIcon icon={faChartLine} /></div>
                        </div>
                    </div>
                )}

                {isSupervisorOrAbove && (
                    <div className="stat-card card-purple">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Items</p>
                                <p className="text-2xl font-bold mt-1">{Number(s?.total_items || 0)}</p>
                                <p className="text-xs opacity-80 mt-1">{Number(s?.total_categories || 0)} categories</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center text-xl"><FontAwesomeIcon icon={faBox} /></div>
                        </div>
                    </div>
                )}

                {isAdmin && (
                    <div className="stat-card card-cyan">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Customers / Loyalty</p>
                                <p className="text-2xl font-bold mt-1">{Number(s?.total_customers || 0)} / {Number(s?.loyalty_customers || 0)}</p>
                                <p className="text-xs opacity-80 mt-1">Total vs Active Loyalty</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center text-xl"><FontAwesomeIcon icon={faUsers} /></div>
                        </div>
                    </div>
                )}

                {isSupervisorOrAbove && (
                    <div className="stat-card card-indigo">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Active Promos</p>
                                <p className="text-xl font-bold mt-1">{String(s?.ongoing_promotions || 0)}</p>
                                <p className="text-xs opacity-80 mt-1">Total Active</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center text-lg"><FontAwesomeIcon icon={faTags} /></div>
                        </div>
                    </div>
                )}

                {isSupervisorOrAbove && (
                    <div className="stat-card card-rose">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Returns (Today)</p>
                                <p className="text-xl font-bold mt-1">{String(s?.return_bills_today || 0)}</p>
                                {isAdmin && <p className="text-xs opacity-80 mt-1">{String(s?.return_bills_month || 0)} this month</p>}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center text-lg"><FontAwesomeIcon icon={faUndo} /></div>
                        </div>
                    </div>
                )}

                {isSupervisorOrAbove && (
                    <div className="stat-card card-orange">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Cancellations (Today)</p>
                                <p className="text-xl font-bold mt-1">{String(s?.cancel_bills_today || 0)}</p>
                                {isAdmin && <p className="text-xs opacity-80 mt-1">{String(s?.cancel_bills_month || 0)} this month</p>}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center text-lg"><FontAwesomeIcon icon={faTimesCircle} /></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Alerts */}
            {isSupervisorOrAbove && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Number(s?.low_stock_items || 0) > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="text-2xl"><FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500" /></span>
                            <div>
                                <p className="font-semibold text-amber-800">{Number(s?.low_stock_items)} Low Stock Items</p>
                                <p className="text-xs text-amber-600">Items running below threshold. Please reorder.</p>
                            </div>
                        </div>
                    )}
                    {Number(s?.out_of_stock_items || 0) > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <span className="text-2xl"><FontAwesomeIcon icon={faBan} className="text-red-500" /></span>
                            <div>
                                <p className="font-semibold text-red-800">{Number(s?.out_of_stock_items)} Out of Stock</p>
                                <p className="text-xs text-red-600">Items with zero quantity. Action required immediately.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sales Chart (Admin/Supervisor Only) */}
            {isSupervisorOrAbove && s?.sales_chart && (
                <div className="glass-card p-4">
                    <h2 className="font-bold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={s.sales_chart as Array<Record<string, unknown>>}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} dx={-10} tickFormatter={(value: any) => `Rs.${Number(value) / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: 'var(--color-primary)', opacity: 0.1 }}
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: 'var(--color-text)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                    formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, 'Sales']}
                                />
                                <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Recent Bills Data Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-gray-900">Recent Bills</h2>
                        <button
                            onClick={fetchBills}
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                            title="Refresh Bills"
                        >
                            <FontAwesomeIcon icon={faSync} className={loadingBills ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Rows per page:</span>
                        <select
                            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                    {loadingBills ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton width="15%" height={24} />
                                    <Skeleton width="25%" height={24} />
                                    <Skeleton width="20%" height={24} />
                                    <Skeleton width="15%" height={24} />
                                    <Skeleton width="10%" height={24} />
                                    <Skeleton width="15%" height={24} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="data-table w-full">
                            <thead>
                                <tr>
                                    <th>Bill #</th>
                                    <th>Customer</th>
                                    <th>Staff</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map((bill: unknown) => {
                                    const b = bill as Record<string, unknown>;
                                    return (
                                        <tr key={String(b.id)} className="hover:bg-gray-50">
                                            <td className="font-mono text-sm">{String(b.bill_number)}</td>
                                            <td>{String(b.customer_name || 'Walk-in')}</td>
                                            <td className="text-sm text-gray-600">{String(b.staff_name)}</td>
                                            <td className="font-semibold">Rs. {Number(b.total_amount).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'returned' ? 'badge-warning' : b.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>
                                                    {String(b.status)}
                                                </span>
                                            </td>
                                            <td className="text-gray-500 text-sm">
                                                {new Date(String(b.created_at)).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!bills.length && (
                                    <tr><td colSpan={6} className="text-center text-gray-400 py-8">No bills found</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page {page} of {totalPages || 1}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-secondary px-3 py-1"
                            disabled={page === 1 || loadingBills}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                        </button>
                        <button
                            className="btn btn-secondary px-3 py-1"
                            disabled={page >= totalPages || loadingBills}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
