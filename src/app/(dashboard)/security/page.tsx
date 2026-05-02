'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShieldAlt,
    faDesktop,
    faMobileAlt,
    faTabletAlt,
    faGlobe,
    faTrash,
    faQrcode,
    faKey,
    faExclamationTriangle,
    faCheckCircle,
    faTimesCircle,
    faSignOutAlt,
    faLock,
    faUnlock,
    faCopy,
    faSync,
    faClock,
    faList,
    faUsers,
    faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import Pagination from '@/components/ui/Pagination';
import DeleteButton from '@/components/ui/DeleteButton';
import Tooltip from '@/components/ui/Tooltip';

interface Session {
    id: string;
    ip_address: string;
    device: { browser: string; os: string; device: string };
    location: { city: string; country: string; region: string };
    created_at: string;
    last_activity: string;
    is_current: boolean;
    user?: { username: string; first_name: string; last_name: string };
}

interface UserItem {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface SecurityEvent {
    id: string;
    event_type: string;
    ip_address: string;
    details: string | null;
    severity: string;
    created_at: string;
}

export default function SecurityPage() {
    const { user, token } = useAuth();
    const { showToast } = useToast();
    const api = useApi();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    // 2FA state
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle');
    const [qrCode, setQrCode] = useState('');
    const [totpSecret, setTotpSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [disablePassword, setDisablePassword] = useState('');
    const [showDisable, setShowDisable] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Sessions Pagination
    const [sessionsPage, setSessionsPage] = useState(1);
    const [sessionsLimit, setSessionsLimit] = useState(5);
    const [sessionsMeta, setSessionsMeta] = useState<any>(null);

    // Events Pagination
    const [eventsPage, setEventsPage] = useState(1);
    const [eventsLimit, setEventsLimit] = useState(10);
    const [eventsMeta, setEventsMeta] = useState<any>(null);

    // Admin — manage other users' sessions
    const isAdmin = (user as any)?.role === 'admin';
    const [allUsers, setAllUsers] = useState<UserItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [adminSessions, setAdminSessions] = useState<Session[]>([]);
    const [adminSessionsMeta, setAdminSessionsMeta] = useState<any>(null);
    const [adminSessionsPage, setAdminSessionsPage] = useState(1);
    const [adminSessionsLimit, setAdminSessionsLimit] = useState(5);
    const [adminLoading, setAdminLoading] = useState(false);

    const fetchSessions = useCallback(async (p: number, l: number) => {
        try {
            const res = await api.get(`/api/auth/sessions?page=${p}&limit=${l}`);
            if (res.success) {
                setSessions(res.data || []);
                setSessionsMeta(res.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setLoading(false);
        }
    }, [api]); // Stable 'api' is key, though useApi might need fix later if identity changes

    const fetchEvents = useCallback(async (p: number, l: number) => {
        try {
            const res = await api.get(`/api/auth/security-events?page=${p}&limit=${l}`);
            if (res.success) {
                setEvents(res.data || []);
                setEventsMeta(res.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch events', err);
        }
    }, [api]);

    // Single source of truth for initial/manual refresh
    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchSessions(1, sessionsLimit), fetchEvents(1, eventsLimit)]);
        setLoading(false);
    }, [fetchSessions, fetchEvents, sessionsLimit, eventsLimit]);

    useEffect(() => {
        fetchSessions(sessionsPage, sessionsLimit);
    }, [sessionsPage, sessionsLimit, fetchSessions]);

    useEffect(() => {
        fetchEvents(eventsPage, eventsLimit);
    }, [eventsPage, eventsLimit, fetchEvents]);

    useEffect(() => {
        // Initial sync for 2FA status only on mount/user change
        if (user) {
            setIs2FAEnabled((user as unknown as { two_factor_enabled?: boolean }).two_factor_enabled || false);
        }
    }, [user]);

    // --- 2FA Setup ---
    const handleSetup2FA = async () => {
        setActionLoading(true);
        try {
            const res = await api.post('/api/auth/2fa/setup');
            if (res.success) {
                setQrCode(res.data.qr_code);
                setTotpSecret(res.data.secret);
                setSetupStep('qr');
            } else {
                showToast(res.message || 'Failed to setup 2FA', 'error');
            }
        } catch {
            showToast('Failed to setup 2FA', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerify2FASetup = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            showToast('Enter a valid 6-digit code', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await api.post('/api/auth/2fa/verify', { code: verifyCode });
            if (res.success) {
                setBackupCodes(res.data?.backup_codes || []);
                setSetupStep('done');
                setIs2FAEnabled(true);
                showToast('2FA enabled successfully!', 'success');
            } else {
                showToast(res.message || 'Invalid code', 'error');
            }
        } catch {
            showToast('Verification failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!disablePassword) {
            showToast('Password is required', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await api.post('/api/auth/2fa/disable', { password: disablePassword });
            if (res.success) {
                setIs2FAEnabled(false);
                setSetupStep('idle');
                setShowDisable(false);
                setDisablePassword('');
                showToast('2FA disabled', 'success');
            } else {
                showToast(res.message || 'Failed to disable 2FA', 'error');
            }
        } catch {
            showToast('Failed to disable 2FA', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Session Management ---
    const handleRevokeSession = async (sessionId: string) => {
        setRevoking(sessionId);
        try {
            const res = await api.post(`/api/auth/sessions/${sessionId}/revoke`);
            if (res.success) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                showToast('Session revoked', 'success');
            } else {
                showToast(res.message || 'Failed to revoke session', 'error');
            }
        } catch {
            showToast('Failed to revoke session', 'error');
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeAll = async () => {
        setActionLoading(true);
        try {
            const res = await api.post('/api/auth/sessions/revoke-all');
            if (res.success) {
                setSessions(prev => prev.filter(s => s.is_current));
                showToast(`${res.data?.revoked_count || 0} sessions revoked`, 'success');
            } else {
                showToast(res.message || 'Failed to revoke sessions', 'error');
            }
        } catch {
            showToast('Failed to revoke sessions', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Admin: Manage other users' sessions ---
    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await api.get('/api/users?limit=100');
            if (res.success) {
                setAllUsers((res.data || []).filter((u: any) => u.id !== (user as any)?.id));
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    }, [api, user]);

    const fetchAdminSessions = useCallback(async (userId: string, p: number, l: number) => {
        if (!userId) return;
        setAdminLoading(true);
        try {
            const res = await api.get(`/api/auth/sessions?userId=${userId}&page=${p}&limit=${l}`);
            if (res.success) {
                setAdminSessions(res.data || []);
                setAdminSessionsMeta(res.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch user sessions', err);
        } finally {
            setAdminLoading(false);
        }
    }, [api]);

    useEffect(() => {
        if (isAdmin) fetchAllUsers();
    }, [isAdmin, fetchAllUsers]);

    useEffect(() => {
        if (selectedUserId) {
            fetchAdminSessions(selectedUserId, adminSessionsPage, adminSessionsLimit);
        } else {
            setAdminSessions([]);
            setAdminSessionsMeta(null);
        }
    }, [selectedUserId, adminSessionsPage, adminSessionsLimit, fetchAdminSessions]);

    const handleAdminRevokeSession = async (sessionId: string) => {
        setRevoking(sessionId);
        try {
            const res = await api.post(`/api/auth/sessions/${sessionId}/revoke`);
            if (res.success) {
                setAdminSessions(prev => prev.filter(s => s.id !== sessionId));
                showToast('Session revoked', 'success');
            } else {
                showToast(res.message || 'Failed to revoke session', 'error');
            }
        } catch {
            showToast('Failed to revoke session', 'error');
        } finally {
            setRevoking(null);
        }
    };

    const handleAdminRevokeAll = async () => {
        if (!selectedUserId) return;
        setActionLoading(true);
        try {
            const res = await api.post(`/api/auth/sessions/revoke-all?userId=${selectedUserId}`);
            if (res.success) {
                setAdminSessions([]);
                showToast(`${res.data?.revoked_count || 0} sessions revoked`, 'success');
            } else {
                showToast(res.message || 'Failed to revoke sessions', 'error');
            }
        } catch {
            showToast('Failed to revoke sessions', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        showToast('Backup codes copied!', 'success');
    };

    const getDeviceIcon = (device: string) => {
        if (device === 'Mobile') return faMobileAlt;
        if (device === 'Tablet') return faTabletAlt;
        return faDesktop;
    };

    const getEventIcon = (type: string) => {
        if (type.includes('FAILED') || type.includes('LOCKED') || type.includes('BRUTE')) return faTimesCircle;
        if (type.includes('SUCCESS') || type.includes('VERIFIED') || type.includes('ENABLED')) return faCheckCircle;
        if (type.includes('REVOKED')) return faSignOutAlt;
        if (type.includes('DISABLED')) return faUnlock;
        return faShieldAlt;
    };

    const getEventColor = (severity: string) => {
        if (severity === 'critical') return 'text-red-500';
        if (severity === 'high') return 'text-orange-500';
        if (severity === 'medium') return 'text-yellow-500';
        return 'text-emerald-500';
    };

    const getSeverityBg = (severity: string) => {
        if (severity === 'critical') return 'bg-red-50 border-red-100';
        if (severity === 'high') return 'bg-orange-50 border-orange-100';
        if (severity === 'medium') return 'bg-yellow-50 border-yellow-100';
        return 'bg-emerald-50 border-emerald-100';
    };

    const formatEventType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const timeAgo = (date: string) => {
        const now = new Date();
        const d = new Date(date);
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <FontAwesomeIcon icon={faShieldAlt} />
                        </div>
                        Security Center
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your account security, 2FA, and active sessions</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                    title="Refresh"
                >
                    <FontAwesomeIcon icon={faSync} />
                </button>
            </div>

            {/* 2FA Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <FontAwesomeIcon icon={faLock} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
                                <p className="text-sm text-slate-500">
                                    {is2FAEnabled ? 'Your account is protected with 2FA' : 'Add an extra layer of security'}
                                </p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${is2FAEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {is2FAEnabled ? '● Enabled' : '○ Disabled'}
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    {!is2FAEnabled && setupStep === 'idle' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-amber-500" />
                            </div>
                            <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                Two-factor authentication adds a critical layer of protection to your account.
                                Use an authenticator app like Google Authenticator or Authy.
                            </p>
                            <button
                                onClick={handleSetup2FA}
                                disabled={actionLoading}
                                className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                                <FontAwesomeIcon icon={faQrcode} />
                                Enable 2FA
                            </button>
                        </div>
                    )}

                    {setupStep === 'qr' && (
                        <div className="text-center py-4">
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Scan QR Code</h3>
                            <p className="text-sm text-slate-500 mb-6">Scan this with your authenticator app</p>
                            {qrCode && (
                                <div className="inline-block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                </div>
                            )}
                            <div className="max-w-sm mx-auto mb-6">
                                <p className="text-xs text-slate-400 mb-1">Or enter manually:</p>
                                <code className="block bg-slate-50 px-4 py-2 rounded-lg text-sm font-mono text-slate-700 break-all select-all border border-slate-200">
                                    {totpSecret}
                                </code>
                            </div>
                            <div className="max-w-sm mx-auto">
                                <label className="text-sm font-semibold text-slate-700 block mb-2">Enter verification code</label>
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg tracking-widest font-mono text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                                <button
                                    onClick={handleVerify2FASetup}
                                    disabled={actionLoading || verifyCode.length !== 6}
                                    className="w-full mt-3 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Verifying...' : 'Verify & Enable'}
                                </button>
                            </div>
                        </div>
                    )}

                    {setupStep === 'done' && backupCodes.length > 0 && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-2xl text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">2FA Enabled!</h3>
                            <p className="text-sm text-red-500 font-semibold mb-4">Save these backup codes — they will NOT be shown again</p>
                            <div className="max-w-sm mx-auto bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, i) => (
                                        <code key={i} className="bg-white px-3 py-2 rounded-lg text-sm font-mono text-slate-800 border border-slate-100">
                                            {code}
                                        </code>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={copyBackupCodes}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2 mx-auto"
                            >
                                <FontAwesomeIcon icon={faCopy} />
                                Copy All Codes
                            </button>
                            <button
                                onClick={() => setSetupStep('idle')}
                                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {is2FAEnabled && setupStep === 'idle' && (
                        <div>
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
                                <p className="text-sm text-emerald-700 font-medium">Two-factor authentication is active</p>
                            </div>

                            {showDisable ? (
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <p className="text-sm text-red-700 font-medium mb-3">Enter your password to disable 2FA</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            value={disablePassword}
                                            onChange={e => setDisablePassword(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-red-200 rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none"
                                            placeholder="Current password"
                                        />
                                        <button
                                            onClick={handleDisable2FA}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {actionLoading ? '...' : 'Disable'}
                                        </button>
                                        <button
                                            onClick={() => { setShowDisable(false); setDisablePassword(''); }}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDisable(true)}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                                >
                                    Disable 2FA
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Admin: All Users Sessions */}
            {isAdmin && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faUserShield} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Manage User Sessions</h2>
                                    <p className="text-sm text-slate-500">Admin: View and revoke sessions for any user</p>
                                </div>
                            </div>
                            {selectedUserId && adminSessions.length > 0 && (
                                <button
                                    onClick={handleAdminRevokeAll}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} />
                                    Revoke All Sessions
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <label className="text-sm font-medium text-slate-700 block mb-2">Select User</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => { setSelectedUserId(e.target.value); setAdminSessionsPage(1); }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
                        >
                            <option value="">— Choose a user —</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.first_name} {u.last_name} (@{u.username}) — {u.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {!selectedUserId ? (
                            <div className="p-8 text-center text-slate-400">
                                <FontAwesomeIcon icon={faUsers} className="text-2xl mb-2" />
                                <p>Select a user to view their active sessions</p>
                            </div>
                        ) : adminLoading ? (
                            <div className="p-8 text-center text-slate-400">
                                <div className="w-8 h-8 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                                Loading sessions...
                            </div>
                        ) : adminSessions.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No active sessions for this user</div>
                        ) : (
                            adminSessions.map(session => (
                                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-500">
                                            <FontAwesomeIcon icon={getDeviceIcon(session.device?.device)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 text-sm">
                                                    {session.device?.browser} on {session.device?.os}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span>{session.ip_address}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                                                    {timeAgo(session.last_activity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Tooltip text="Revoke Session">
                                        <DeleteButton onDelete={() => handleAdminRevokeSession(session.id)} />
                                    </Tooltip>
                                </div>
                            ))
                        )}
                    </div>

                    {adminSessionsMeta && adminSessionsMeta.total > 0 && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <Pagination
                                currentPage={adminSessionsPage}
                                totalPages={adminSessionsMeta.pages}
                                totalItems={adminSessionsMeta.total}
                                rowsPerPage={adminSessionsLimit}
                                onPageChange={setAdminSessionsPage}
                                onRowsPerPageChange={(rows) => { setAdminSessionsLimit(rows); setAdminSessionsPage(1); }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <FontAwesomeIcon icon={faGlobe} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
                                <p className="text-sm text-slate-500">
                                    {sessionsMeta?.total || sessions.length} active session{(sessionsMeta?.total || sessions.length) !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        {sessions.length > 1 && (
                            <button
                                onClick={handleRevokeAll}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} />
                                Revoke All Others
                            </button>
                        )}
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                            Loading sessions...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No active sessions found</div>
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${session.is_current ? 'bg-indigo-50/50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.is_current ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <FontAwesomeIcon icon={getDeviceIcon(session.device?.device)} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {session.device?.browser} on {session.device?.os}
                                            </span>
                                            {session.is_current && (
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span>{session.ip_address}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                                                {timeAgo(session.last_activity)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!session.is_current && (
                                    <Tooltip text="Revoke Session">
                                        <DeleteButton onDelete={() => handleRevokeSession(session.id)} />
                                    </Tooltip>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {sessionsMeta && sessionsMeta.total > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <Pagination
                            currentPage={sessionsPage}
                            totalPages={sessionsMeta.pages}
                            totalItems={sessionsMeta.total}
                            rowsPerPage={sessionsLimit}
                            onPageChange={setSessionsPage}
                            onRowsPerPageChange={(rows) => { setSessionsLimit(rows); setSessionsPage(1); }}
                        />
                    </div>
                )}
            </div>

            {/* Security Events Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faKey} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Security Events</h2>
                            <p className="text-sm text-slate-500">Recent security activity on your account</p>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {events.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No security events recorded</div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className={`p-4 flex items-center gap-4 ${getSeverityBg(event.severity)} bg-opacity-30`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getEventColor(event.severity)} bg-white border border-current/10`}>
                                    <FontAwesomeIcon icon={getEventIcon(event.event_type)} className="text-sm" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-slate-900">
                                            {formatEventType(event.event_type)}
                                        </span>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                            event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {event.severity.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                        <span>{event.ip_address}</span>
                                        {event.details && (
                                            <>
                                                <span>•</span>
                                                <span className="truncate">{event.details}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {timeAgo(event.created_at)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {eventsMeta && eventsMeta.total > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <Pagination
                            currentPage={eventsPage}
                            totalPages={eventsMeta.pages}
                            totalItems={eventsMeta.total}
                            rowsPerPage={eventsLimit}
                            onPageChange={setEventsPage}
                            onRowsPerPageChange={(rows) => { setEventsLimit(rows); setEventsPage(1); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
