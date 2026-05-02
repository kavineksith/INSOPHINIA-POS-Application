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

export default function CategoriesPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetch = () => {
        setLoading(true);
        apiFetch(`/api/categories?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`)
            .then(res => {
                if (res.success) {
                    setCategories(res.data);
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
        const res = editId ? await apiFetch(`/api/categories/${editId}`, { method: 'PUT', body: JSON.stringify(form) }) : await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(form) });
        if (res.success) { showToast(res.message, 'success'); setShowForm(false); setForm({ name: '', description: '' }); setEditId(null); fetch(); } else showToast(res.message, 'error');
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (res.success) { showToast('Category deleted', 'success'); fetch(); } else showToast(res.message, 'error');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search categories..." />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={fetch}
                        className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Refresh Categories"
                    >
                        <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {currentUser && hasPermission(currentUser.role, 'manage:categories') && (
                        <button onClick={() => { setEditId(null); setForm({ name: '', description: '' }); setShowForm(true); }} className="btn-primary">
                            <FontAwesomeIcon icon={faPlus} /> Add Category
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={limit} cols={4} />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>Description</th><th>Items</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {categories.map(c => (
                                        <tr key={String(c.id)}>
                                            <td className="font-medium text-slate-900">{String(c.name)}</td>
                                            <td className="text-gray-500 text-sm">{String(c.description || '-')}</td>
                                            <td><span className="badge badge-info">{Number(c.item_count || 0)}</span></td>
                                            <td className="flex gap-2">
                                                {currentUser && hasPermission(currentUser.role, 'manage:categories') && (
                                                    <>
                                                        <Tooltip text="Edit Category">
                                                            <button
                                                                onClick={() => { setEditId(String(c.id)); setForm({ name: String(c.name), description: String(c.description || '') }); setShowForm(true); }}
                                                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Delete Category">
                                                            <DeleteButton onDelete={() => deleteCategory(String(c.id))} />
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No categories found</td></tr>}
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
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Category' : 'Add Category'}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} /></div>
                    <div className="flex gap-2"><button type="submit" className="btn-primary flex-1 justify-center">{editId ? 'Update' : 'Create'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </form>
            </Modal>
        </div>
    );
}
