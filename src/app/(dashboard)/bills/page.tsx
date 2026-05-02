'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faUndo, faTimesCircle, faShieldAlt, faPrint, faEnvelope, faSearch, faSync } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import PasswordInput from '@/components/ui/PasswordInput';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function BillsPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [bills, setBills] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedBill, setSelectedBill] = useState<Record<string, unknown> | null>(null);
    const [settings, setSettings] = useState<any>({});
    const [showDetail, setShowDetail] = useState(false);
    const [returnPrompt, setReturnPrompt] = useState<{
        isOpen: boolean;
        type: 'return' | 'cancel';
        reason: string;
        authorizer_username: string;
        authorizer_password: string;
        submitting: boolean
    }>({
        isOpen: false, type: 'return', reason: '', authorizer_username: '', authorizer_password: '', submitting: false
    });

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchBills = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        params.set('page', String(page));
        params.set('limit', String(limit));
        apiFetch(`/api/billing?${params}`).then(res => {
            if (res.success) {
                setBills(res.data);
                if (res.pagination) {
                    setTotalPages(res.pagination.pages);
                    setTotalItems(res.pagination.total);
                }
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchBills();
        apiFetch('/api/settings').then(res => { if (res.success) setSettings(res.data); });
    }, [page, limit, statusFilter]);

    useEffect(() => {
        setPage(1);
        fetchBills();
    }, [search]);

    const viewBill = async (id: string) => {
        const res = await apiFetch(`/api/billing/${id}`);
        if (res.success) { setSelectedBill(res.data); setShowDetail(true); }
    };

    const handlePrint = (id: string) => {
        const printUrl = `/api/billing/${id}/print`;
        const printWindow = window.open(printUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    };

    const handleEmail = async (id: string, email: string) => {
        if (!email) {
            const targetEmail = prompt('Please enter customer email:');
            if (!targetEmail) return;
            email = targetEmail;
        }
        showToast('Sending email...', 'success');
        const res = await apiFetch(`/api/billing/${id}/email`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        if (res.success) showToast('Email sent successfully!', 'success');
        else showToast(res.message || 'Failed to send email', 'error');
    };

    const shareToWhatsApp = (bill: any) => {
        if (!bill) return;

        const phone = bill.customer_phone || "";
        const sep = '─'.repeat(28);
        const shopName = settings.company_name || 'INSOPHINIA POS';
        const shopAddr = settings.company_address || '';
        const shopPhone = settings.company_phone || '';

        const itemsList = (bill.items || []).map((i: any) => {
            const name = i.item_name || 'Item';
            const qty = i.quantity;
            const price = Number(i.unit_price).toFixed(2);
            const total = Number(i.subtotal).toFixed(2);
            return `  ${name}\n    ${qty} x Rs.${price} = Rs.${total}`;
        }).join('\n');

        const subtotal = (Number(bill.subtotal) || 0).toFixed(2);
        const discount = (Number(bill.total_discount) || 0).toFixed(2);
        const total = (Number(bill.total_amount) || 0).toFixed(2);
        const paid = (Number(bill.paid_amount) || 0).toFixed(2);
        const balance = (Number(bill.balance) || 0).toFixed(2);

        let message = `*${shopName}*\n`;
        if (shopAddr) message += `${shopAddr}\n`;
        if (shopPhone) message += `📞 ${shopPhone}\n`;
        message += `${sep}\n`;
        message += `*Bill #:* ${bill.bill_number}\n`;
        message += `*Date:* ${new Date(bill.created_at).toLocaleString()}\n`;
        if (bill.staff_name) message += `*Cashier:* ${bill.staff_name}\n`;
        message += `${sep}\n`;
        message += `*Items:*\n${itemsList}\n`;
        message += `${sep}\n`;
        message += `  Subtotal:  Rs. ${subtotal}\n`;
        if (Number(discount) > 0) message += `  Discount:  -Rs. ${discount}\n`;
        message += `${sep}\n`;
        message += `  *TOTAL:    Rs. ${total}*\n`;
        message += `  Paid:      Rs. ${paid}\n`;
        message += `  Balance:   Rs. ${balance}\n`;
        message += `${sep}\n`;
        message += `_Thank you for shopping with us!_`;

        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Bills</h1>

            <div className="flex flex-wrap gap-3">
                <div className="relative max-w-xs w-full">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Search bills..."
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <FontAwesomeIcon icon={faSearch} />
                    </div>
                </div>
                <button
                    onClick={fetchBills}
                    className="btn-secondary h-[42px] w-10 flex items-center justify-center bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all"
                    title="Refresh Bills"
                >
                    <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                </button>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field max-w-[150px]">
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={limit} cols={7} />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table min-w-[800px]">
                                <thead><tr><th>Bill #</th><th>Customer</th><th>Staff</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                                <tbody>
                                    {bills.map(b => (
                                        <tr key={String(b.id)}>
                                            <td className="font-mono text-sm">{String(b.bill_number)}</td>
                                            <td>{String(b.customer_name)}</td>
                                            <td>{String(b.staff_name)}</td>
                                            <td className="font-semibold">Rs. {Number(b.total_amount).toLocaleString()}</td>
                                            <td><span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'returned' ? 'badge-warning' : 'badge-danger'}`}>{String(b.status)}</span></td>
                                            <td className="text-sm text-gray-500">{new Date(String(b.created_at)).toLocaleString()}</td>
                                            <td>
                                                <button
                                                    onClick={() => viewBill(String(b.id))}
                                                    className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                                    title="View Bill Details"
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {bills.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No bills found</td></tr>}
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

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Bill #${selectedBill?.bill_number || ''}`} maxWidth="max-w-2xl">
                {selectedBill && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{String(selectedBill.customer_name)}</span></div>
                            <div><span className="text-gray-500">Staff:</span> <span className="font-medium">{String(selectedBill.staff_name)}</span></div>
                            <div><span className="text-gray-500">Status:</span> <span className={`badge ${selectedBill.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{String(selectedBill.status)}</span></div>
                            <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(String(selectedBill.created_at)).toLocaleString()}</span></div>
                        </div>
                        <div className="overflow-x-auto w-full border rounded-lg my-4">
                            <table className="data-table w-full">
                                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Discount</th><th>Subtotal</th></tr></thead>
                                <tbody>
                                    {(selectedBill.items as unknown[] || []).map((item: unknown) => {
                                        const i = item as Record<string, unknown>;
                                        return (
                                            <tr key={String(i.id)}>
                                                <td className="min-w-[120px]">{String(i.item_name)}</td>
                                                <td className="text-center">{Number(i.quantity)}</td>
                                                <td className="min-w-[80px]">Rs. {Number(i.unit_price).toFixed(2)}</td>
                                                <td className="min-w-[80px]">{Number(i.discount) > 0 ? `Rs. ${Number(i.discount).toFixed(2)}` : '-'}</td>
                                                <td className="font-semibold min-w-[80px]">Rs. {Number(i.subtotal).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-right space-y-1 text-sm border-t pt-3">
                            <p>Subtotal: <span className="font-medium">Rs. {Number(selectedBill.subtotal).toFixed(2)}</span></p>
                            <p>Discount: <span className="font-medium text-green-600">-Rs. {Number(selectedBill.total_discount).toFixed(2)}</span></p>
                            <p className="text-lg font-bold">Total: <span className="text-indigo-600">Rs. {Number(selectedBill.total_amount).toFixed(2)}</span></p>
                            <p>Paid: Rs. {Number(selectedBill.paid_amount).toFixed(2)}</p>
                            <p>Balance: Rs. {Number(selectedBill.balance).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <button className="btn-secondary py-2.5 px-3 justify-center bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 text-xs sm:text-sm" onClick={() => handlePrint(String(selectedBill.id))}>
                                    <FontAwesomeIcon icon={faPrint} /> A4 Bill
                                </button>
                                <button className="btn-secondary py-2.5 px-3 justify-center bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 text-xs sm:text-sm" onClick={() => {
                                    const printUrl = `/api/billing/${selectedBill.id}/print?type=thermal`;
                                    const printWindow = window.open(printUrl, '_blank');
                                    if (printWindow) {
                                        printWindow.onload = () => {
                                            printWindow.print();
                                        };
                                    }
                                }}>
                                    <FontAwesomeIcon icon={faPrint} /> Receipt
                                </button>
                                <button className="btn-secondary py-2.5 px-3 justify-center bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 text-xs sm:text-sm" onClick={() => handleEmail(String(selectedBill.id), String(selectedBill.customer_email || ''))}>
                                    <FontAwesomeIcon icon={faEnvelope} /> Email
                                </button>
                                <button className="btn-secondary py-2.5 px-3 justify-center bg-green-50 text-green-700 border-green-100 hover:bg-green-100 text-xs sm:text-sm" onClick={() => shareToWhatsApp(selectedBill)}>
                                    <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
                                </button>
                            </div>

                            {selectedBill.status === 'completed' && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button className="btn-secondary py-2.5 px-4 justify-center text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setReturnPrompt({ isOpen: true, type: 'return', reason: '', authorizer_username: '', authorizer_password: '', submitting: false })}>
                                        <FontAwesomeIcon icon={faUndo} /> Return Items
                                    </button>
                                    <button className="btn-secondary py-2.5 px-4 justify-center text-red-600 border-red-200 hover:bg-red-50" onClick={() => setReturnPrompt({ isOpen: true, type: 'cancel', reason: '', authorizer_username: '', authorizer_password: '', submitting: false })}>
                                        <FontAwesomeIcon icon={faTimesCircle} /> Cancel Bill
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={returnPrompt.isOpen} onClose={() => setReturnPrompt(p => ({ ...p, isOpen: false, authorizer_password: '', reason: '', authorizer_username: '' }))} title={returnPrompt.type === 'return' ? 'Supervisor Authorization Required' : 'Supervisor Authorization Required'} maxWidth="max-w-md">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">A supervisor or administrator must authorize this {returnPrompt.type}. This action will be logged.</p>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reason / Remarks</label>
                        <textarea value={returnPrompt.reason} onChange={e => setReturnPrompt(p => ({ ...p, reason: e.target.value }))} className="input-field w-full min-h-[80px]" placeholder={`Enter remarks for ${returnPrompt.type}...`} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supervisor Username</label>
                            <input
                                type="text"
                                value={returnPrompt.authorizer_username}
                                onChange={e => setReturnPrompt(p => ({ ...p, authorizer_username: e.target.value }))}
                                className="input-field w-full"
                                placeholder="Enter username"
                                autoComplete="username"
                            />
                        </div>
                        <PasswordInput
                            label="Supervisor Password"
                            value={returnPrompt.authorizer_password}
                            onChange={e => setReturnPrompt(p => ({ ...p, authorizer_password: e.target.value }))}
                            placeholder="Enter password"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-3 mt-6">
                        <button className="btn-secondary" onClick={() => setReturnPrompt(p => ({ ...p, isOpen: false, authorizer_password: '', reason: '', authorizer_username: '' }))}>Close</button>
                        <button
                            className="btn-primary"
                            disabled={returnPrompt.submitting || !returnPrompt.reason || !returnPrompt.authorizer_username || !returnPrompt.authorizer_password}
                            onClick={async () => {
                                setReturnPrompt(p => ({ ...p, submitting: true }));
                                const res = await apiFetch(`/api/billing/${selectedBill?.id}/${returnPrompt.type}`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        reason: returnPrompt.reason,
                                        authorizer_username: returnPrompt.authorizer_username,
                                        authorizer_password: returnPrompt.authorizer_password
                                    })
                                });
                                setReturnPrompt(p => ({ ...p, submitting: false }));
                                if (res.success) {
                                    showToast(`Bill ${returnPrompt.type}ed successfully. Authorized by ${returnPrompt.authorizer_username}.`, 'success');
                                    setReturnPrompt(p => ({ ...p, isOpen: false, authorizer_password: '', reason: '', authorizer_username: '' }));
                                    setShowDetail(false);
                                    fetchBills();
                                } else {
                                    showToast(res.message || 'Error processing request', 'error');
                                }
                            }}
                        >
                            {returnPrompt.submitting ? 'Authenticating...' : `Authorize & ${returnPrompt.type === 'cancel' ? 'Cancel' : 'Return'}`}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
