'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faDownload, faSpinner, faSync, faTrash, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function BackupsPage() {
    const { apiFetch } = useApi();
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchBackups = useCallback(() => {
        setLoading(true);
        apiFetch('/api/backups')
            .then((res: any) => {
                if (res.success) setBackups(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [apiFetch]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const handleCreateBackup = async () => {
        setActionLoading('create');
        try {
            const res = await apiFetch('/api/backups', { method: 'POST' });
            if (res.success) {
                toast.success('Database backup created and securely uploaded to Supabase.');
                fetchBackups();
            } else {
                toast.error(res.message || 'Failed to create backup');
            }
        } catch (error) {
            toast.error('An error occurred while creating the backup.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteBackup = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this backup?')) return;
        setActionLoading(`delete-${id}`);
        try {
            const res = await apiFetch(`/api/backups/${id}`, { method: 'DELETE' });
            if (res.success) {
                toast.success('Backup deleted from storage.');
                fetchBackups();
            } else {
                toast.error(res.message || 'Failed to delete backup');
            }
        } catch (error) {
            toast.error('An error occurred during deletion.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadBackup = (id: string, filename: string) => {
        // Trigger generic file download via the browser standard link method so the user gets the file dialogue
        const link = document.createElement('a');
        link.href = `/api/backups/${id}/download`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FontAwesomeIcon icon={faDatabase} />
                        </div>
                        Database Backups
                    </h1>
                    <p className="text-muted mt-1 flex items-center gap-2">
                         <FontAwesomeIcon icon={faShieldAlt} className="text-green-500" /> Backups are AES-256-GCM encrypted and stored securely on Supabase Storage. Auto-retained for 7 days.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCreateBackup} className="btn-primary" disabled={actionLoading === 'create' || loading}>
                        {actionLoading === 'create' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faDatabase} />} Create New Backup
                    </button>
                    <button onClick={fetchBackups} className="btn-secondary" disabled={loading}>
                        <FontAwesomeIcon icon={faSync} className={loading && actionLoading !== 'create' ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="glass-card zoom-in">
                <div className="overflow-x-auto min-h-[300px] relative">
                    {loading && backups.length === 0 && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-500" />
                        </div>
                    )}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Size</th>
                                <th>Creator</th>
                                <th>Created On</th>
                                <th>Expires In</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {backups.length === 0 && !loading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-muted">No backups found</td></tr>
                            ) : backups.map(backup => {
                                const createdDate = new Date(backup.created_at);
                                const expiryDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                                const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
                                
                                return (
                                    <tr key={backup.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="font-medium text-gray-800 font-mono text-xs">{backup.filename}</td>
                                        <td className="text-gray-600 text-sm">{formatSize(backup.file_size)}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold capitalize text-gray-700">{backup.backup_type}</span>
                                                <span className="text-xs text-gray-500 uppercase tracking-widest">{backup.username}</span>
                                            </div>
                                        </td>
                                        <td className="text-sm text-gray-600">{format(createdDate, 'MMM d, yyyy HH:mm')}</td>
                                        <td>
                                            {daysRemaining > 0 ? (
                                                <span className={`badge ${daysRemaining <= 2 ? 'badge-warning' : 'badge-success'}`}>
                                                    {daysRemaining} days left
                                                </span>
                                            ) : (
                                                <span className="badge badge-danger">Expired</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                                                    className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center border border-indigo-100 shadow-sm"
                                                    title="Download Encrypted Backup"
                                                >
                                                    <FontAwesomeIcon icon={faDownload} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBackup(backup.id)}
                                                    disabled={actionLoading === `delete-${backup.id}`}
                                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 shadow-sm disabled:opacity-50"
                                                    title="Permanently Delete"
                                                >
                                                    {actionLoading === `delete-${backup.id}` ? (
                                                        <FontAwesomeIcon icon={faSpinner} spin />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
