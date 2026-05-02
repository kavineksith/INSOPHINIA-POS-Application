'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSearch, faPlus, faBarcode, faQrcode, faCamera, faSync } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import DeleteButton from '@/components/ui/DeleteButton';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import ScannerModal from '@/components/pos/ScannerModal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function ItemsPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState<'search' | 'barcode' | 'qr_code'>('search');
    const [form, setForm] = useState({ plu_code: '', name: '', description: '', category_id: '', barcode: '', qr_code: '', price: '', cost_price: '', unit: 'pcs', stock_quantity: '', low_stock_threshold: '10', has_discount: false, discount_percentage: '' });

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchItems = () => {
        setLoading(true);
        apiFetch(`/api/items?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`).then(res => {
            if (res.success) {
                setItems(res.data);
                if (res.pagination) {
                    setTotalPages(res.pagination.pages);
                    setTotalItems(res.pagination.total);
                }
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchItems();
        apiFetch('/api/categories?limit=100').then(res => { if (res.success) setCategories(res.data); });
    }, [page, limit]);

    useEffect(() => {
        setPage(1);
        fetchItems();
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, price: parseFloat(form.price), cost_price: parseFloat(form.cost_price), stock_quantity: parseFloat(form.stock_quantity || '0'), low_stock_threshold: parseFloat(form.low_stock_threshold), discount_percentage: parseFloat(form.discount_percentage || '0') };
        const res = editId
            ? await apiFetch(`/api/items/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
            : await apiFetch('/api/items', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) { showToast(res.message, 'success'); setShowForm(false); resetForm(); fetchItems(); }
        else showToast(res.message, 'error');
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        const res = await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
        if (res.success) { showToast('Item deleted', 'success'); fetchItems(); }
        else showToast(res.message, 'error');
    };

    const editItem = (item: Record<string, unknown>) => {
        setEditId(String(item.id));
        setForm({ plu_code: String(item.plu_code), name: String(item.name), description: String(item.description || ''), category_id: String(item.category_id), barcode: String(item.barcode || ''), qr_code: String(item.qr_code || ''), price: String(item.price), cost_price: String(item.cost_price), unit: String(item.unit || 'pcs'), stock_quantity: String(item.stock_quantity), low_stock_threshold: String(item.low_stock_threshold), has_discount: Boolean(item.has_discount), discount_percentage: String(item.discount_percentage || '') });
        setShowForm(true);
    };

    const resetForm = () => { setEditId(null); setForm({ plu_code: '', name: '', description: '', category_id: '', barcode: '', qr_code: '', price: '', cost_price: '', unit: 'pcs', stock_quantity: '', low_stock_threshold: '10', has_discount: false, discount_percentage: '' }); };

    const handleBarcodeScan = (code: string) => {
        if (showForm) {
            if (scanTarget === 'barcode') {
                setForm(prev => ({ ...prev, barcode: code }));
            } else if (scanTarget === 'qr_code') {
                setForm(prev => ({ ...prev, qr_code: code }));
            }
        } else {
            setSearch(code);
            showToast(`Searching for: ${code}`, 'info');
        }
    };

    useBarcodeScanner({ onScan: handleBarcodeScan, enabled: true });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Items</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search items..." />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={fetchItems}
                        className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Refresh Items"
                    >
                        <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => { setScanTarget('search'); setIsScannerOpen(true); }}
                        className="btn-secondary h-[42px] px-4 flex items-center gap-2 bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                        <FontAwesomeIcon icon={faCamera} />
                        <span className="hidden sm:inline">Scan Code</span>
                    </button>
                    {currentUser && hasPermission(currentUser.role, 'manage:items') && (
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
                            <FontAwesomeIcon icon={faPlus} /> Add Item
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? <TableSkeleton rows={limit} cols={7} /> : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table min-w-[800px]">
                                <thead><tr><th>PLU</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={String(item.id)}>
                                            <td className="font-mono text-sm text-gray-700">{String(item.plu_code)}</td>
                                            <td className="font-medium text-gray-800">{String(item.name)}</td>
                                            <td className="text-gray-600">{String(item.category_name)}</td>
                                            <td className="text-gray-800">Rs. {Number(item.price).toFixed(2)}</td>
                                            <td><span className={Number(item.stock_quantity) === 0 ? 'text-red-600 font-semibold' : Number(item.stock_quantity) <= Number(item.low_stock_threshold) ? 'text-amber-600 font-semibold' : 'text-gray-700'}>{Number(item.stock_quantity)} {String(item.unit || 'pcs')}</span></td>
                                            <td><span className={`badge ${Number(item.stock_quantity) === 0 ? 'badge-danger' : Number(item.stock_quantity) <= Number(item.low_stock_threshold) ? 'badge-warning' : 'badge-success'}`}>{Number(item.stock_quantity) === 0 ? 'Out' : Number(item.stock_quantity) <= Number(item.low_stock_threshold) ? 'Low' : 'OK'}</span></td>
                                            <td className="flex gap-2">
                                                {currentUser && hasPermission(currentUser.role, 'manage:items') && (
                                                    <>
                                                        <Tooltip text="Edit Item">
                                                            <button
                                                                onClick={() => editItem(item)}
                                                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Delete Item">
                                                            <DeleteButton onDelete={() => deleteItem(String(item.id))} />
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No items found</td></tr>}
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

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Item' : 'Add Item'} maxWidth="max-w-xl">
                <form onSubmit={handleSubmit} className="space-y-3 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">PLU Code *</label><input value={form.plu_code} onChange={e => setForm({ ...form, plu_code: e.target.value })} className="input-field" required /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1 flex justify-between">
                                Barcode
                                <button type="button" onClick={() => { setScanTarget('barcode'); setIsScannerOpen(true); }} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                    <FontAwesomeIcon icon={faCamera} className="text-xs" />
                                </button>
                            </label>
                            <div className="relative group">
                                <FontAwesomeIcon icon={faBarcode} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="input-field pl-10" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1 flex justify-between">
                                QR Code
                                <button type="button" onClick={() => { setScanTarget('qr_code'); setIsScannerOpen(true); }} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                    <FontAwesomeIcon icon={faCamera} className="text-xs" />
                                </button>
                            </label>
                            <div className="relative group">
                                <FontAwesomeIcon icon={faQrcode} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input value={form.qr_code} onChange={e => setForm({ ...form, qr_code: e.target.value })} className="input-field pl-10" />
                            </div>
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Category *</label><select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input-field" required><option value="">Select Category</option>{categories.map(c => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Unit *</label><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input-field" required><option value="pcs">Pieces (pcs)</option><option value="kg">Kilograms (kg)</option><option value="g">Grams (g)</option><option value="l">Liters (l)</option><option value="ml">Milliliters (ml)</option><option value="m">Meters (m)</option><option value="cm">Centimeters (cm)</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Price *</label><input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field" required /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Cost Price *</label><input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} className="input-field" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Stock Qty</label><input type="number" step="0.001" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="input-field" /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Low Stock Threshold</label><input type="number" step="0.001" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} className="input-field" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-center">
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.has_discount} onChange={e => setForm({ ...form, has_discount: e.target.checked })} className="rounded" /> Has Discount</label>
                        {form.has_discount && <div><input type="number" step="0.01" value={form.discount_percentage} onChange={e => setForm({ ...form, discount_percentage: e.target.value })} className="input-field" placeholder="Discount %" /></div>}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="submit" className="btn-primary flex-1 justify-center">{editId ? 'Update' : 'Create'} Item</button>
                        <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                </form>
            </Modal>

            <ScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScan}
            />
        </div>
    );
}
