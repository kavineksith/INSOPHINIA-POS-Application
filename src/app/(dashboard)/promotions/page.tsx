'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSearch, faPlus, faSync } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import DeleteButton from '@/components/ui/DeleteButton';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function PromotionsPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [promotions, setPromotions] = useState<Record<string, unknown>[]>([]);
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '', item_id: '', category_id: '', discount_type: 'percentage', discount_value: '', start_date: '', end_date: '', is_active: true });
    const [targetType, setTargetType] = useState<'item' | 'category'>('item');

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetch = () => {
        setLoading(true);
        apiFetch(`/api/promotions?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`)
            .then(res => {
                if (res.success) {
                    setPromotions(res.data);
                    if (res.pagination) {
                        setTotalPages(res.pagination.pages);
                        setTotalItems(res.pagination.total);
                    }
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetch();
        apiFetch('/api/items?limit=200').then(res => { if (res.success) setItems(res.data); });
        apiFetch('/api/categories?limit=100').then(res => { if (res.success) setCategories(res.data); });
    }, [page, limit]);

    useEffect(() => {
        setPage(1);
        fetch();
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            discount_value: parseFloat(form.discount_value),
            item_id: targetType === 'item' ? (form.item_id || null) : null,
            category_id: targetType === 'category' ? (form.category_id || null) : null
        };
        const res = editId ? await apiFetch(`/api/promotions/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/promotions', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) { showToast(res.message, 'success'); setShowForm(false); resetForm(); fetch(); } else showToast(res.message, 'error');
    };

    const deletePromotion = async (id: string) => { if (!confirm('Delete?')) return; const res = await apiFetch(`/api/promotions/${id}`, { method: 'DELETE' }); if (res.success) { showToast('Deleted', 'success'); fetch(); } else showToast(res.message, 'error'); };
    const resetForm = () => {
        setEditId(null);
        setForm({ name: '', description: '', item_id: '', category_id: '', discount_type: 'percentage', discount_value: '', start_date: '', end_date: '', is_active: true });
        setTargetType('item');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Promotions</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search promotions..." />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={fetch}
                        className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Refresh Promotions"
                    >
                        <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {currentUser && hasPermission(currentUser.role, 'manage:promotions') && (
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
                            <FontAwesomeIcon icon={faPlus} /> Add Promotion
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
                                    <tr><th>Name</th><th>Target</th><th>Discount</th><th>Period</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {promotions.map(p => (
                                        <tr key={String(p.id)}>
                                            <td className="font-medium">{String(p.name)}</td>
                                            <td className="text-sm">{p.item_name ? `Item: ${p.item_name}` : p.category_name ? `Cat: ${p.category_name}` : '-'}</td>
                                            <td className="font-semibold text-green-600">{p.discount_type === 'percentage' ? `${Number(p.discount_value)}%` : `Rs. ${Number(p.discount_value)}`}</td>
                                            <td className="text-xs text-gray-500">{new Date(String(p.start_date)).toLocaleDateString()} - {new Date(String(p.end_date)).toLocaleDateString()}</td>
                                            <td>
                                                {(() => {
                                                    const now = new Date();
                                                    const start = new Date(String(p.start_date));
                                                    const end = new Date(String(p.end_date));
                                                    if (!p.is_active) return <span className="badge badge-danger">Inactive</span>;
                                                    if (now < start) return <span className="badge bg-blue-100 text-blue-700 border border-blue-200">Upcoming</span>;
                                                    if (now > end) return <span className="badge bg-gray-100 text-gray-600 border border-gray-200">Expired</span>;
                                                    return <span className="badge badge-success">Active</span>;
                                                })()}
                                            </td>
                                            <td className="flex gap-2">
                                                {currentUser && hasPermission(currentUser.role, 'manage:promotions') && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditId(String(p.id));
                                                                setForm({ name: String(p.name), description: String(p.description || ''), item_id: String(p.item_id || ''), category_id: String(p.category_id || ''), discount_type: String(p.discount_type), discount_value: String(p.discount_value), start_date: String(p.start_date).split('T')[0], end_date: String(p.end_date).split('T')[0], is_active: Boolean(p.is_active) });
                                                                setTargetType(p.category_id ? 'category' : 'item');
                                                                setShowForm(true);
                                                            }}
                                                            className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                            title="Edit Promotion"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <Tooltip text="Delete Promotion">
                                                            <DeleteButton onDelete={() => deletePromotion(String(p.id))} />
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {promotions.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No promotions found</td></tr>}
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
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Promotion' : 'Add Promotion'} maxWidth="max-w-xl">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">Promotion Target</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={targetType === 'item'} onChange={() => setTargetType('item')} className="text-indigo-600" />
                                <span className="text-sm">Specific Item</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={targetType === 'category'} onChange={() => setTargetType('category')} className="text-indigo-600" />
                                <span className="text-sm">Whole Category</span>
                            </label>
                        </div>
                        {targetType === 'item' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Select Item *</label>
                                <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} className="input-field" required>
                                    <option value="">Choose item...</option>
                                    {items.map(i => <option key={String(i.id)} value={String(i.id)}>{String(i.name)}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Select Category *</label>
                                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input-field" required>
                                    <option value="">Choose category...</option>
                                    {categories.map(c => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-600 mb-1">Type</label><select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="input-field"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div><div><label className="block text-sm font-medium text-gray-600 mb-1">Value *</label><input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="input-field" required /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-600 mb-1">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-field" required /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">End Date *</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-field" required /></div></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
                    <div className="flex gap-2"><button type="submit" className="btn-primary flex-1 justify-center">{editId ? 'Update' : 'Create'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </form>
            </Modal>
        </div>
    );
}
