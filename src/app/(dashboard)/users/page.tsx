'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faKey, faSearch, faUserPlus, faUserCheck, faUserSlash, faUnlock, faSync, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import DeleteButton from '@/components/ui/DeleteButton';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import PasswordInput from '@/components/ui/PasswordInput';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function UsersPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setSearchShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'cashier', first_name: '', last_name: '' });
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetch = () => {
        setLoading(true);
        apiFetch(`/api/users?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`)
            .then(res => {
                if (res.success) {
                    setUsers(res.data);
                    if (res.pagination) {
                        setTotalPages(res.pagination.pages);
                        setTotalItems(res.pagination.total);
                    }
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, [page, limit]);

    useEffect(() => {
        setPage(1);
        fetch();
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = editId ? { username: form.username, email: form.email, role: form.role, first_name: form.first_name, last_name: form.last_name } : form;
        const res = editId ? await apiFetch(`/api/users/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) { showToast(res.message, 'success'); setSearchShowForm(false); resetForm(); fetch(); } else showToast(res.message, 'error');
    };

    const deleteUser = async (id: string) => { if (!confirm('Delete this user?')) return; const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' }); if (res.success) { showToast('User deleted', 'success'); fetch(); } else showToast(res.message, 'error'); };
    const resetPassword = async (id: string) => {
        if (!confirm('Reset password to a temporary one?')) return;
        const res = await apiFetch(`/api/users/${id}/reset-password`, { method: 'POST' });
        if (res.success) {
            setTempPassword(res.data.temp_password);
        } else {
            showToast(res.message, 'error');
        }
    };
    const resetForm = () => { setEditId(null); setForm({ username: '', email: '', password: '', role: 'cashier', first_name: '', last_name: '' }); };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const res = await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: !currentStatus })
        });
        if (res.success) {
            showToast(`User ${!currentStatus ? 'activated' : 'disabled'}`, 'success');
            fetch();
        } else showToast(res.message, 'error');
    };

    const unlockUser = async (id: string) => {
        const res = await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ locked_until: null })
        });
        if (res.success) {
            showToast('User account unlocked', 'success');
            fetch();
        } else showToast(res.message, 'error');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search users..." />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={fetch}
                        className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Refresh Users"
                    >
                        <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {currentUser && hasPermission(currentUser.role, 'manage:users') && (
                        <button onClick={() => { resetForm(); setSearchShowForm(true); }} className="btn-primary">
                            <FontAwesomeIcon icon={faUserPlus} /> Add User
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={limit} cols={6} />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={String(u.id)}>
                                            <td className="font-mono text-sm text-gray-700">{String(u.username)}</td>
                                            <td className="font-medium text-gray-800">{String(u.first_name)} {String(u.last_name)}</td>
                                            <td className="text-gray-600">{String(u.email)}</td>
                                            <td><span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'supervisor' ? 'badge-warning' : 'badge-info'}`}>{String(u.role)}</span></td>
                                            <td>
                                                {(() => {
                                                    const isLocked = u.locked_until && new Date(String(u.locked_until)) > new Date();
                                                    if (!u.is_active) return <span className="badge badge-danger">Disabled</span>;
                                                    if (isLocked) return <span className="badge badge-warning">Locked</span>;
                                                    return <span className="badge badge-success">Active</span>;
                                                })()}
                                            </td>
                                            <td className="flex gap-2">
                                                {currentUser && hasPermission(currentUser.role, 'manage:users') && (
                                                    <>
                                                        <Tooltip text="Edit User">
                                                            <button
                                                                onClick={() => { setEditId(String(u.id)); setForm({ username: String(u.username), email: String(u.email), password: '', role: String(u.role), first_name: String(u.first_name), last_name: String(u.last_name) }); setSearchShowForm(true); }}
                                                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Reset Password">
                                                            <button
                                                                onClick={() => resetPassword(String(u.id))}
                                                                className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <FontAwesomeIcon icon={faKey} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text={u.is_active ? 'Disable User' : 'Activate User'}>
                                                            <button
                                                                onClick={() => toggleStatus(String(u.id), !!u.is_active)}
                                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${u.is_active
                                                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                                                                    : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white'
                                                                    }`}
                                                            >
                                                                <FontAwesomeIcon icon={u.is_active ? faUserSlash : faUserCheck} />
                                                            </button>
                                                        </Tooltip>
                                                        {u.locked_until && new Date(String(u.locked_until)) > new Date() && (
                                                            <Tooltip text="Unlock Account">
                                                                <button
                                                                    onClick={() => unlockUser(String(u.id))}
                                                                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                                                >
                                                                    <FontAwesomeIcon icon={faUnlock} />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip text="Delete User">
                                                            <DeleteButton onDelete={() => deleteUser(String(u.id))} />
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No users found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            rowsPerPage={limit}
                            onPageChange={setPage}
                            onRowsPerPageChange={(l) => { setLimit(l); setPage(1); }}
                        />
                    </>
                )}
            </div>
            <Modal isOpen={showForm} onClose={() => setSearchShowForm(false)} title={editId ? 'Edit User' : 'Add User'}>
                <form onSubmit={handleSubmit} className="space-y-3 text-left">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-600 mb-1">First Name *</label><input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="input-field" required /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">Last Name *</label><input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="input-field" required /></div></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Username *</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input-field" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" required /></div>
                    {!editId && (
                        <PasswordInput
                            label="Password *"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={12}
                            maxLength={30}
                            autoComplete="new-password"
                        />
                    )}
                    {!editId && (
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-2">
                             <p className="text-xs text-gray-400">Min 12 chars, uppercase, lowercase, number, special char</p>
                             <p className="text-xs text-indigo-600 font-medium mt-1">Note: User will be forced to change this password on their first login.</p>
                        </div>
                    )}
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Role *</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field"><option value="cashier">Cashier</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option></select></div>
                    <div className="flex gap-2"><button type="submit" className="btn-primary flex-1 justify-center">{editId ? 'Update' : 'Create'} User</button><button type="button" onClick={() => setSearchShowForm(false)} className="btn-secondary">Cancel</button></div>
                </form>
            </Modal>

            <Modal isOpen={!!tempPassword} onClose={() => setTempPassword(null)} title="Password Reset Successful">
                <div className="space-y-4 text-center py-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                        <FontAwesomeIcon icon={faKey} />
                    </div>
                    <div>
                        <p className="text-gray-600 mb-2">A new temporary password has been generated:</p>
                        <div className="bg-slate-100 p-4 rounded-xl font-mono text-xl font-bold tracking-wider text-slate-800 border border-slate-200 select-all">
                            {tempPassword}
                        </div>
                        <p className="text-sm text-amber-600 mt-4 font-medium flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500" />
                            Please copy this and give it to the user.
                        </p>
                    </div>
                    <button onClick={() => setTempPassword(null)} className="btn-primary w-full justify-center py-3">Done</button>
                </div>
            </Modal>
        </div>
    );
}
