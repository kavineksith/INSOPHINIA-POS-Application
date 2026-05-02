'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faArrowDown, faArrowUp, faHammer, faQuestionCircle, faBarcode, faCamera, faSync } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import ScannerModal from '@/components/pos/ScannerModal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function InventoryPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState<'stock-in' | 'stock-out' | 'damage' | 'lost'>('stock-in');
    const [form, setForm] = useState({ item_id: '', quantity: '', notes: '' });
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchInventory = () => {
        setLoading(true);
        apiFetch(`/api/inventory?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`).then(res => {
            if (res.success) {
                setItems(res.data);
                if (res.pagination) {
                    setTotalPages(res.pagination.pages);
                    setTotalItems(res.pagination.total);
                }
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchInventory(); }, [page, limit]);

    useEffect(() => {
        setPage(1);
        fetchInventory();
    }, [search]);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch(`/api/inventory/${actionType}`, { method: 'POST', body: JSON.stringify({ item_id: form.item_id, quantity: parseFloat(form.quantity), notes: form.notes }) });
        if (res.success) { showToast(res.message, 'success'); setShowModal(false); setForm({ item_id: '', quantity: '', notes: '' }); fetchInventory(); } else showToast(res.message, 'error');
    };

    const openAction = (type: typeof actionType, itemId: string) => { setActionType(type); setForm({ item_id: itemId, quantity: '', notes: '' }); setShowModal(true); };

    const handleBarcodeScan = async (code: string) => {
        // First look in currently loaded items
        const item = items.find(i =>
            String(i.barcode) === code ||
            String(i.plu_code) === code ||
            (i.qr_code && String(i.qr_code) === code)
        );

        if (item) {
            openAction('stock-in', String(item.id));
            showToast(`Item found: ${item.name}`, 'success');
        } else {
            // Try fetching from server if not in current page
            showToast('Item not in current view, searching server...', 'info');
            const res = await apiFetch(`/api/items?search=${code}&limit=1`);
            if (res.success && res.data.length > 0) {
                const foundItem = res.data[0];
                openAction('stock-in', String(foundItem.id));
                showToast(`Item found: ${foundItem.name}`, 'success');
            } else {
                showToast(`Unknown code: ${code}`, 'error');
            }
        }
    };

    useBarcodeScanner({ onScan: handleBarcodeScan, enabled: true });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsScannerOpen(true)} className="btn-secondary h-[42px] px-4 flex items-center gap-2 bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all">
                        <FontAwesomeIcon icon={faCamera} />
                        <span className="hidden sm:inline">Scan Code</span>
                    </button>
                    <div className="relative">
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search items..." />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={fetchInventory}
                        className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Refresh Inventory"
                    >
                        <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? <TableSkeleton rows={limit} cols={10} /> : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table min-w-[1000px]">
                                <thead>
                                    <tr><th>PLU</th><th>Name</th><th>Category</th><th>Stock</th><th>Total</th><th>Sold</th><th>Returned</th><th>Damaged</th><th>Lost</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={String(item.id)}>
                                            <td className="font-mono text-sm">{String(item.plu_code)}</td>
                                            <td className="font-medium">{String(item.name)}</td>
                                            <td>{String(item.category_name)}</td>
                                            <td><span className={`font-semibold ${item.is_out_of_stock ? 'text-red-600' : item.is_low_stock ? 'text-amber-600' : 'text-green-600'}`}>{Number(item.stock_quantity)} {String(item.unit || 'pcs')}</span></td>
                                            <td>{Number(item.total_quantity)}</td><td>{Number(item.sell_quantity)}</td><td>{Number(item.return_quantity)}</td><td>{Number(item.damage_quantity)}</td><td>{Number(item.lost_quantity)}</td>
                                            <td className="flex gap-1">
                                                <Tooltip text="Stock In">
                                                    <button
                                                        onClick={() => openAction('stock-in', String(item.id))}
                                                        className="w-7 h-7 rounded bg-green-50 text-green-600 hover:bg-green-600 hover:text-white flex items-center justify-center transition-all"
                                                    >
                                                        <FontAwesomeIcon icon={faArrowUp} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Stock Out">
                                                    <button
                                                        onClick={() => openAction('stock-out', String(item.id))}
                                                        className="w-7 h-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all"
                                                    >
                                                        <FontAwesomeIcon icon={faArrowDown} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Mark Damaged">
                                                    <button
                                                        onClick={() => openAction('damage', String(item.id))}
                                                        className="w-7 h-7 rounded bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-all"
                                                    >
                                                        <FontAwesomeIcon icon={faHammer} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Mark Lost">
                                                    <button
                                                        onClick={() => openAction('lost', String(item.id))}
                                                        className="w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all"
                                                    >
                                                        <FontAwesomeIcon icon={faQuestionCircle} />
                                                    </button>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && <tr><td colSpan={10} className="text-center text-gray-400 py-8">No items</td></tr>}
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${actionType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}>
                <form onSubmit={handleAction} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Item</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm font-semibold text-gray-800">
                            {(items.find(i => i.id === form.item_id)?.name as string) || 'Loading...'}
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Quantity *</label><input type="number" min="0.001" step="0.001" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="input-field" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} /></div>
                    <button type="submit" className="btn-primary w-full justify-center">Confirm</button>
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
