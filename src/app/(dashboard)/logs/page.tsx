'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSync, faSearch, faEye, faLock, faReceipt, faBox, faUsers, faDatabase, faCogs, faShieldAlt, faClipboardList, faBroom, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

export default function LogsPage() {
    const { apiFetch } = useApi();

    // Event Logs State
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [timeRange, setTimeRange] = useState('24h');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    // Summary stats
    const [summary, setSummary] = useState<any>(null);

    const getFromDateStr = (range: string) => {
        if (range === 'all') return '';
        const date = new Date();
        switch (range) {
            case '1h': date.setHours(date.getHours() - 1); break;
            case '24h': date.setDate(date.getDate() - 1); break;
            case '48h': date.setDate(date.getDate() - 2); break;
            case '7d': date.setDate(date.getDate() - 7); break;
            case '30d': date.setDate(date.getDate() - 30); break;
        }
        return date.toISOString();
    };

    // Fetch Event Logs
    const fetchLogs = useCallback(() => {
        setLogsLoading(true);
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (search) params.append('search', search);
        if (levelFilter) params.append('level', levelFilter);
        if (categoryFilter) params.append('category', categoryFilter);
        
        const fromDate = getFromDateStr(timeRange);
        if (fromDate) params.append('from', fromDate);

        apiFetch(`/api/logs?${params.toString()}`)
            .then((res: any) => {
                if (res.success) {
                    setLogs(res.data);
                    setTotalPages(res.pagination.pages);
                    setTotalItems(res.pagination.total);
                }
            })
            .catch(console.error)
            .finally(() => setLogsLoading(false));
    }, [apiFetch, page, limit, search, levelFilter, categoryFilter, timeRange]);

    // Fetch summary
    const fetchSummary = useCallback(() => {
        apiFetch('/api/logs/aggregate')
            .then((res: any) => { if (res.success) setSummary(res.data); })
            .catch(console.error);
    }, [apiFetch]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Initial summary load
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handleCleanup = async () => {
        setIsCleaningUp(true);
        try {
            const res = await apiFetch('/api/logs/aggregate', { method: 'POST' });
            if (res.success) {
                toast.success('System maintenance completed. Old backups cleaned up.');
                fetchLogs();
            } else {
                toast.error(res.message || 'Failed to run maintenance');
            }
        } catch (error) {
            toast.error('An error occurred during maintenance.');
        } finally {
            setIsCleaningUp(false);
        }
    };

    const handleExportLogs = () => {
        const params = new URLSearchParams();
        if (levelFilter) params.append('level', levelFilter);
        if (categoryFilter) params.append('category', categoryFilter);
        
        const fromDate = getFromDateStr(timeRange);
        if (fromDate) params.append('from', fromDate);
        
        window.open(`/api/logs/export?${params.toString()}`, '_blank');
    };

    const getLevelClass = (level: string) => {
        switch (level) {
            case 'info': return 'badge-info';
            case 'warn': return 'badge-warning';
            case 'error': return 'badge-danger';
            case 'critical': return 'bg-red-600 text-white badge';
            default: return 'bg-gray-100 text-gray-800 badge';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'auth': return <FontAwesomeIcon icon={faLock} className="text-gray-500 mr-1" />;
            case 'billing': return <FontAwesomeIcon icon={faReceipt} className="text-gray-500 mr-1" />;
            case 'inventory': return <FontAwesomeIcon icon={faBox} className="text-gray-500 mr-1" />;
            case 'users': return <FontAwesomeIcon icon={faUsers} className="text-gray-500 mr-1" />;
            case 'backup': return <FontAwesomeIcon icon={faDatabase} className="text-gray-500 mr-1" />;
            case 'system': return <FontAwesomeIcon icon={faCogs} className="text-gray-500 mr-1" />;
            case 'security': return <FontAwesomeIcon icon={faShieldAlt} className="text-gray-500 mr-1" />;
            default: return <FontAwesomeIcon icon={faClipboardList} className="text-gray-500 mr-1" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">System Logs</h1>
                    <p className="text-muted">Monitor all system activity and events.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCleanup} className="btn-secondary" disabled={isCleaningUp}>
                        {isCleaningUp ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faBroom} />} Cleanup
                    </button>
                    <button onClick={handleExportLogs} className="btn-secondary">
                        <FontAwesomeIcon icon={faDownload} /> Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {summary.by_level.map((l: any) => (
                        <div
                            key={l.level}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                levelFilter === l.level ? 'ring-2 ring-indigo-400 border-indigo-300' : 'border-gray-100 hover:border-indigo-200'
                            } bg-white shadow-sm flex flex-col items-center sm:items-start`}
                            onClick={() => { setLevelFilter(levelFilter === l.level ? '' : l.level); setPage(1); }}
                        >
                            <p className="text-2xl font-bold text-gray-900">{l.count}</p>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{l.level}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Logs Table */}
            <div className="glass-card zoom-in">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-3 flex-1 flex-wrap">
                        <div className="relative max-w-xs flex-1 min-w-[200px]">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                className="input-field pl-10 h-[42px]"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <select
                            className="input-field max-w-[130px] h-[42px]"
                            value={timeRange}
                            onChange={e => { setTimeRange(e.target.value); setPage(1); }}
                        >
                            <option value="1h">Last Hour</option>
                            <option value="24h">Last 24 Hrs</option>
                            <option value="48h">Last 48 Hrs</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">Whole Time</option>
                        </select>
                        <select
                            className="input-field max-w-[130px] h-[42px]"
                            value={levelFilter}
                            onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select
                            className="input-field max-w-[140px] h-[42px]"
                            value={categoryFilter}
                            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Categories</option>
                            <option value="auth">Auth</option>
                            <option value="billing">Billing</option>
                            <option value="inventory">Inventory</option>
                            <option value="users">Users</option>
                            <option value="system">System</option>
                            <option value="backup">Backup</option>
                            <option value="security">Security</option>
                        </select>
                    </div>
                    <button onClick={fetchLogs} className="btn-secondary h-[42px]" disabled={logsLoading}>
                        <FontAwesomeIcon icon={faSync} className={logsLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto relative min-h-[300px]">
                    {logsLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-500" />
                        </div>
                    )}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level & Category</th>
                                <th>Action</th>
                                <th>Message</th>
                                <th>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 && !logsLoading ? (
                                <tr><td colSpan={5} className="text-center py-12 text-muted">No logs found matching your filters</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-indigo-50/50 cursor-pointer transition-colors" onClick={() => setSelectedLog(log)}>
                                    <td className="whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {format(new Date(log.created_at), 'MMM d, yy HH:mm')}
                                        <div className="text-[10px] text-gray-400">{format(new Date(log.created_at), 'ss')}s</div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className={`badge ${getLevelClass(log.level)}`}>{log.level.toUpperCase()}</span>
                                            <span className="text-xs text-gray-500 font-medium tracking-wide flex items-center">{getCategoryIcon(log.category)} {log.category}</span>
                                        </div>
                                    </td>
                                    <td className="font-semibold text-gray-800 text-sm whitespace-nowrap">{log.action}</td>
                                    <td className="text-sm text-gray-600 max-w-[250px] md:max-w-md truncate" title={log.message}>{log.message}</td>
                                    <td>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                            className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center border border-indigo-100 shadow-sm"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {logs.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <Pagination 
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            rowsPerPage={limit}
                            onPageChange={setPage}
                            onRowsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                        />
                    </div>
                )}
            </div>

            {/* Log Detail Modal */}
            <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Log Entry Details" maxWidth="max-w-xl">
                {selectedLog && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Level</p>
                                <span className={`badge ${getLevelClass(selectedLog.level)}`}>{selectedLog.level.toUpperCase()}</span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</p>
                                <span className="text-sm font-semibold text-gray-700 flex items-center">{getCategoryIcon(selectedLog.category)} {selectedLog.category}</span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 col-span-2 md:col-span-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Timestamp</p>
                                <span className="text-sm font-medium text-gray-700">{format(new Date(selectedLog.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-50">
                            <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider mb-1.5">Action</p>
                            <span className="text-sm font-bold text-indigo-900 font-mono tracking-tight">{selectedLog.action}</span>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Message</p>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{selectedLog.message}</p>
                        </div>

                        {selectedLog.metadata && (
                            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Metadata</p>
                                <pre className="text-xs text-green-400 font-mono overflow-x-auto max-h-60 rounded custom-scrollbar">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedLog.user_id && (
                                <div className="p-3 border border-gray-100 rounded-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faUsers} className="text-xs" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">User ID</p>
                                        <p className="text-xs text-gray-700 font-mono truncate">{selectedLog.user_id}</p>
                                    </div>
                                </div>
                            )}
                            {selectedLog.ip_address && (
                                <div className="p-3 border border-gray-100 rounded-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faShieldAlt} className="text-xs" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masked IP</p>
                                        <p className="text-xs text-gray-700 font-mono truncate" title={selectedLog.ip_address}>{selectedLog.ip_address}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button className="btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
