'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStore, faEnvelope, faShieldAlt, faSave,
    faMoon, faSun, faKey, faHistory, faClock, faCheckCircle,
    faPhone, faMapMarkerAlt, faTrash, faLaptop, faPrint, faBarcode,
    faPercent, faLock, faUnlock, faExclamationTriangle, faUserShield
} from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import DeleteButton from '@/components/ui/DeleteButton';
import { useDevice } from '@/hooks/useDevice';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [backups, setBackups] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [systemState, setSystemState] = useState<any>(null);
    const [lockReason, setLockReason] = useState('');
    const { deviceId, profile, updateProfile, loading: deviceLoading } = useDevice();

    const fetchData = async () => {
        setLoading(true);
        const [sets, backs, sys] = await Promise.all([
            apiFetch('/api/settings'),
            apiFetch('/api/backups'),
            apiFetch('/api/system/status')
        ]);
        if (sets.success) {
            const s: Record<string, string> = {};
            for (const [k, v] of Object.entries(sets.data as Record<string, unknown>)) s[k] = String(v);
            setSettings(s);
        }
        if (backs.success) setBackups(backs.data);
        if (sys.success) setSystemState(sys.data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        setSaving(true);
        const resSettings = await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });

        let success = resSettings.success;
        let msg = resSettings.message;

        if (success) {
            msg = 'Settings saved!';
            showToast(msg, 'success');
        } else {
            showToast(msg, 'error');
        }
        setSaving(false);
    };

    const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });

    const handleBackup = async () => {
        setBackingUp(true);
        const res = await apiFetch('/api/backups', { method: 'POST' });
        if (res.success) {
            showToast('Backup created!', 'success');
            const backs = await apiFetch('/api/backups');
            if (backs.success) setBackups(backs.data);
        } else showToast(res.message, 'error');
        setBackingUp(false);
    };

    const deleteBackup = async (id: string) => {
        if (!confirm('Delete this backup?')) return;
        const res = await apiFetch(`/api/backups/${id}`, { method: 'DELETE' });
        if (res.success) {
            showToast('Backup deleted', 'success');
            setBackups(backups.filter(b => String(b.id) !== id));
        } else showToast(res.message, 'error');
    };

    const handleSystemLock = async (action: 'lock' | 'unlock' | 'checkin') => {
        if (action === 'lock' && !confirm('Are you absolutely sure you want to lock the system? All non-master users will be locked out immediately.')) return;
        if (action === 'unlock' && !confirm('Are you sure you want to unlock the system?')) return;

        const url = `/api/system/${action}`;
        const method = action === 'checkin' ? 'POST' : (action === 'lock' ? 'POST' : 'DELETE');
        const body = action === 'lock' ? JSON.stringify({ reason: lockReason }) : undefined;

        const res = await apiFetch(url, { method, body });
        if (res.success) {
            showToast(res.message, 'success');
            const sys = await apiFetch('/api/system/status');
            if (sys.success) setSystemState(sys.data);
            if (action === 'lock') setLockReason('');
        } else {
            showToast(res.message || 'Operation failed', 'error');
        }
    };

    if (loading) return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton width={120} height={32} />
                <Skeleton width={150} height={42} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card p-5 space-y-4">
                        <Skeleton width="40%" height={20} />
                        <div className="space-y-3">
                            <Skeleton width="100%" height={40} />
                            <Skeleton width="100%" height={40} />
                            <Skeleton width="100%" height={40} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <FontAwesomeIcon icon={faSave} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5 space-y-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faStore} className="text-indigo-500" />
                        Shop Settings
                    </h2>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Shop Name</label><input value={settings.shop_name || ''} onChange={e => update('shop_name', e.target.value)} className="input-field" placeholder="INSOPHINIA" /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Shop Address</label><input value={settings.shop_address || ''} onChange={e => update('shop_address', e.target.value)} className="input-field" placeholder="123 Main St, City" /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Loyalty Point (Rs per 1 pt)</label><input type="number" value={settings.loyalty_point_value || '100'} onChange={e => update('loyalty_point_value', e.target.value)} className="input-field" placeholder="100" /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Shop Phone</label><input value={settings.shop_phone || ''} onChange={e => update('shop_phone', e.target.value)} className="input-field" placeholder="+94 123 456 789" /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                                <FontAwesomeIcon icon={faKey} />
                                Pwd Expiry (days)
                            </label>
                            <input type="number" value={settings.password_expiry_days || '7'} onChange={e => update('password_expiry_days', e.target.value)} className="input-field" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faPercent} className="text-emerald-500" />
                        Tax settings
                    </h2>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                            <input type="checkbox" checked={String(settings.tax_enabled) !== 'false'} onChange={e => update('tax_enabled', e.target.checked ? 'true' : 'false')} className="rounded" />
                            <span>Enable Tax Calculations</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">VAT Rate (%)</label>
                            <input type="number" step="0.1" value={settings.vat_rate || '18'} onChange={e => update('vat_rate', e.target.value)} className="input-field" />
                            <p className="text-xs text-gray-400 mt-1">Recommended: 18%</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">SSCL Rate (%)</label>
                            <input type="number" step="0.1" value={settings.sscl_rate || '2.5'} onChange={e => update('sscl_rate', e.target.value)} className="input-field" />
                            <p className="text-xs text-gray-400 mt-1">Recommended: 2.5%</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEnvelope} className="text-blue-500" />
                        Email Settings
                    </h2>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                            <input type="checkbox" checked={String(settings.email_enabled) === '1' || String(settings.email_enabled) === 'true'} onChange={e => update('email_enabled', e.target.checked ? 'true' : 'false')} className="rounded" />
                            <span>Enable Email Notifications</span>
                        </label>
                        <button
                            onClick={async () => {
                                showToast('Sending test email...', 'info');
                                const res = await apiFetch('/api/settings/test-email', { method: 'POST' });
                                if (res.success) showToast(res.message, 'success');
                                else showToast(res.message, 'error');
                            }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                        >
                            Test Config
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sender Email (From)</label>
                            <input value={settings.email_from || ''} onChange={e => update('email_from', e.target.value)} className="input-field" placeholder="POS Name <noreply@example.com>" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">SMTP Host</label>
                            <input value={settings.email_host || ''} onChange={e => update('email_host', e.target.value)} className="input-field" placeholder="smtp.gmail.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">SMTP Port</label>
                            <input value={settings.email_port || '587'} onChange={e => update('email_port', e.target.value)} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">SMTP Username</label>
                            <input value={settings.email_username || ''} onChange={e => update('email_username', e.target.value)} className="input-field" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">SMTP Password</label>
                            <input type="password" value={settings.email_password || ''} onChange={e => update('email_password', e.target.value)} className="input-field" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FontAwesomeIcon icon={faLaptop} className="text-purple-500" />
                            This Device's Hardware
                        </h2>
                        <span className="text-xs text-gray-400 font-mono" title="Unique ID for this specific browser/device">{deviceId?.substring(0, 8)}</span>
                    </div>

                    {deviceLoading ? (
                        <div className="space-y-4">
                            <div>
                                <Skeleton width="30%" height={16} className="mb-1" />
                                <Skeleton width="100%" height={40} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Skeleton width="50%" height={16} className="mb-1" />
                                    <Skeleton width="100%" height={40} />
                                </div>
                                <div>
                                    <Skeleton width="50%" height={16} className="mb-1" />
                                    <Skeleton width="100%" height={40} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Device Name</label>
                                <input
                                    value={profile?.name || ''}
                                    onChange={e => updateProfile({ name: e.target.value })}
                                    onBlur={e => showToast('Device name updated', 'success')}
                                    className="input-field"
                                    placeholder="e.g. Front Counter iPad"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faPrint} /> Default Printer
                                    </label>
                                    <select
                                        className="input-field py-2"
                                        value={profile?.defaultPrinter || 'thermal'}
                                        onChange={e => {
                                            updateProfile({ defaultPrinter: e.target.value as 'thermal' | 'a4' });
                                            showToast('Printer preference updated', 'success');
                                        }}
                                    >
                                        <option value="thermal">Thermal (Roll, 80mm)</option>
                                        <option value="a4">Standard (A4, Network)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faBarcode} /> Default Scanner
                                    </label>
                                    <select
                                        className="input-field py-2"
                                        value={profile?.defaultScanner || 'keyboard'}
                                        onChange={e => {
                                            updateProfile({ defaultScanner: e.target.value as 'keyboard' | 'camera' });
                                            showToast('Scanner preference updated', 'success');
                                        }}
                                    >
                                        <option value="keyboard">USB / Bluetooth Scanner</option>
                                        <option value="camera">Device Camera</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserShield} className="text-rose-500" />
                            Master System Control
                        </h2>
                        {systemState?.isLocked ? (
                            <span className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-full flex items-center gap-1"><FontAwesomeIcon icon={faLock} /> LOCKED</span>
                        ) : (
                            <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1"><FontAwesomeIcon icon={faUnlock} /> SECURE</span>
                        )}
                    </div>
                    
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">Deadman Switch Timer</span>
                            <span className={`font-bold ${systemState?.daysRemaining < 7 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {systemState?.daysRemaining} days remaining
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            {systemState && (
                                <div 
                                    className={`h-2 rounded-full ${systemState.daysRemaining < 7 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min(100, Math.max(0, (systemState.daysRemaining / (systemState.deadmanDays || 72)) * 100))}%` }}
                                ></div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            Auto-locks after {systemState?.deadmanDays || 72} days of inactivity. Action required to prevent system freeze.
                        </p>
                        <button onClick={() => handleSystemLock('checkin')} className="w-full btn-secondary py-2 text-sm justify-center">
                            Acknowledge & Reset Timer
                        </button>
                    </div>

                    {systemState?.isLocked ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
                            <p className="text-sm font-bold text-rose-800"><FontAwesomeIcon icon={faExclamationTriangle} /> System is currently Locked</p>
                            <p className="text-xs text-rose-600">{systemState.lockReason}</p>
                            <button onClick={() => handleSystemLock('unlock')} className="w-full btn-primary bg-rose-600 border-rose-600 hover:bg-rose-700 py-2 justify-center">
                                <FontAwesomeIcon icon={faUnlock} className="mr-2" /> Unlock System
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 border-t border-slate-100 pt-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Manual Lock Reason (Optional)</label>
                                <input value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="e.g. Suspected breach, Subscription ended" className="input-field text-sm py-1.5" />
                            </div>
                            <button onClick={() => handleSystemLock('lock')} className="w-full btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50 py-2 justify-center">
                                <FontAwesomeIcon icon={faLock} className="mr-2" /> Lock System Now
                            </button>
                        </div>
                    )}
                </div>

                <div className="glass-card p-5 space-y-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-red-500" />
                        Security Info
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> JWT Auth</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> bcrypt (12 rnds)</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Rate Limiting</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Zod Validation</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Security Headers</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Account Lockout</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> Audit Logging</div>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 border border-green-100 font-medium"><FontAwesomeIcon icon={faCheckCircle} className="text-green-600" /> OWASP Protected</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
