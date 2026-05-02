'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShoppingCart, faPrint, faEnvelope, faCheckCircle, faPlus, faMinus, faBarcode, faCamera, faUserPlus, faBolt, faStar, faGift, faLock, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import Tooltip from '@/components/ui/Tooltip';
import { useDevice } from '@/hooks/useDevice';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import ScannerModal from '@/components/pos/ScannerModal';
import { Skeleton } from '@/components/ui/Skeleton';

interface CartItem {
    item_id: string;
    name: string;
    plu_code: string;
    price: number;
    discount_percentage: number;
    quantity: number;
    stock_quantity: number;
    unit: string;
    display_unit: string;
}

const UNIT_CONVERSIONS: Record<string, { available: string[], multipliers: Record<string, number> }> = {
    'kg': { available: ['kg', 'g'], multipliers: { 'kg': 1, 'g': 1000 } },
    'l': { available: ['l', 'ml'], multipliers: { 'l': 1, 'ml': 1000 } },
    'm': { available: ['m', 'cm'], multipliers: { 'm': 1, 'cm': 100 } },
};

export default function BillingPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('Customer');
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completedBill, setCompletedBill] = useState<any | null>(null);
    const [settings, setSettings] = useState<any>({});
    const [emailPrompt, setEmailPrompt] = useState<{ isOpen: boolean; email: string; sending: boolean }>({ isOpen: false, email: '', sending: false });
    const { profile } = useDevice();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [redeemPoints, setRedeemPoints] = useState(false);
    const thermalPrinter = useThermalPrinter();


    // Loyalty & Customer Search
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerMobile, setCustomerMobile] = useState('');
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', loyalty_points: '0' });
    const [authModal, setAuthModal] = useState({ isOpen: false, username: '', password: '' });

    useEffect(() => {
        setLoading(true);
        apiFetch('/api/items?limit=100')
            .then(res => { if (res.success) setItems(res.data); })
            .finally(() => setLoading(false));
        apiFetch('/api/settings').then(res => { if (res.success) setSettings(res.data); });
    }, [apiFetch]);

    const handleCustomerSearch = async () => {
        if (!customerMobile || customerMobile.length < 3) return;
        setSearchingCustomer(true);
        const res = await apiFetch(`/api/customers?search=${customerMobile}&limit=1`);
        if (res.success && res.data.length > 0) {
            setSelectedCustomer(res.data[0]);
            showToast(`Member found: ${res.data[0].name}`, 'success');
        } else {
            setSelectedCustomer(null);
            setForm({ ...form, phone: customerMobile });
            setShowRegisterModal(true);
        }
        setSearchingCustomer(false);
    };

    const handleRegisterCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(form) });
        if (res.success) {
            showToast('Customer registered successfully!', 'success');
            setSelectedCustomer({
                id: res.data.id,
                name: form.name,
                email: form.email,
                phone: form.phone,
                loyalty_points: parseInt(form.loyalty_points) || 0
            });
            setShowRegisterModal(false);
            setForm({ name: '', email: '', phone: '', loyalty_points: '0' });
        } else showToast(res.message, 'error');
    };

    const filteredItems = items.filter(i =>
        String(i.name).toLowerCase().includes(search.toLowerCase()) ||
        String(i.plu_code).toLowerCase().includes(search.toLowerCase()) ||
        (i.barcode && String(i.barcode).toLowerCase().includes(search.toLowerCase()))
    );

    const addToCart = (item: Record<string, unknown>) => {
        const existing = cart.find(c => c.item_id === item.id);
        if (existing) {
            if (existing.quantity >= Number(item.stock_quantity)) {
                showToast('Insufficient stock', 'warning');
                return;
            }
            setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            const stock = Number(item.stock_quantity);
            if (stock <= 0) {
                showToast(`Item ${item.name} out of stock`, 'warning');
                return;
            }
            setCart([...cart, {
                item_id: String(item.id), name: String(item.name), plu_code: String(item.plu_code),
                price: Number(item.price), discount_percentage: Number(item.discount_percentage || 0),
                quantity: 1, stock_quantity: stock, unit: String(item.unit || 'pcs'), display_unit: String(item.unit || 'pcs')
            }]);
        }

    };

    const handleBarcodeScan = (code: string) => {
        const item = items.find(i =>
            String(i.barcode) === code ||
            String(i.plu_code) === code ||
            (i.qr_code && String(i.qr_code) === code)
        );
        if (item) {
            addToCart(item);
            showToast(`Scanned: ${item.name}`, 'success');
        } else {
            showToast(`Unknown code: ${code}`, 'error');
        }
    };

    useBarcodeScanner({ onScan: handleBarcodeScan, enabled: true });

    const updateQty = (itemId: string, qty: number) => {
        if (qty <= 0) {
            setCart(cart.filter(c => c.item_id !== itemId));
        } else {
            setCart(cart.map(c => c.item_id === itemId ? { ...c, quantity: Math.min(qty, c.stock_quantity) } : c));
        }
    };

    const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
    const totalDiscount = cart.reduce((sum, c) => sum + (c.price * c.discount_percentage / 100) * c.quantity, 0);
    const pointsDiscount = redeemPoints && selectedCustomer ? Math.min(subtotal - totalDiscount, selectedCustomer.loyalty_points) : 0;
    const afterDiscount = subtotal - totalDiscount - pointsDiscount;

    // Tax calculations from settings
    const taxEnabled = settings.tax_enabled !== false;
    const vatRate = taxEnabled ? (parseFloat(settings.vat_rate) || 18) / 100 : 0;
    const ssclRate = taxEnabled ? (parseFloat(settings.sscl_rate) || 2.5) / 100 : 0;
    const vatAmount = afterDiscount * vatRate;
    const ssclAmount = afterDiscount * ssclRate;
    const taxTotal = vatAmount + ssclAmount;
    const totalAmount = afterDiscount + taxTotal;

    const paid = parseFloat(paidAmount) || 0;
    const balance = paid - totalAmount;

    // Loyalty preview
    const earnedPoints = Math.floor(totalAmount / 100);

    const handleSubmit = async () => {
        if (cart.length === 0) { showToast('Add items to cart', 'warning'); return; }
        if (paid < totalAmount) { showToast('Insufficient payment amount', 'warning'); return; }

        setSubmitting(true);
        try {
            const res = await apiFetch('/api/billing', {
                method: 'POST',
                body: JSON.stringify({
                    customer_id: selectedCustomer?.id || null,
                    customer_name: selectedCustomer?.name || customerName,
                    customer_email: selectedCustomer?.email || null,
                    customer_phone: selectedCustomer?.phone || customerMobile || null,
                    points_redeemed: redeemPoints ? pointsDiscount : 0,
                    paid_amount: paid,
                    remarks: remarks || null,
                    items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
                    authorizer_username: authModal.username || null,
                    authorizer_password: authModal.password || null,
                }),
            });
            if (res.success) {
                showToast(`Bill ${res.data.bill_number} created!`, 'success');
                // Fetch full bill details for printing
                const billDetailsRes = await apiFetch(`/api/billing/${res.data.id}`);
                if (billDetailsRes.success) {
                    setCompletedBill(billDetailsRes.data);
                } else {
                    setCompletedBill(res.data); // Fallback to basic info
                }


                setCart([]);
                setPaidAmount('');
                setRemarks('');
                setCustomerName('Customer');
                setSelectedCustomer(null);
                setCustomerMobile('');
                setRedeemPoints(false);
                setAuthModal({ isOpen: false, username: '', password: '' });
                // Refresh items
                const itemsRes = await apiFetch('/api/items?limit=100');
                if (itemsRes.success) setItems(itemsRes.data);
            } else {
                showToast(res.message || 'Failed to create bill', 'error');
            }
        } catch { showToast('Error creating bill', 'error'); }
        finally { setSubmitting(false); }
    };

    const shareToWhatsApp = () => {
        if (!completedBill) return;

        const phone = completedBill.customer_phone || "";
        const sep = '─'.repeat(28);
        const shopName = settings.company_name || 'INSOPHINIA POS';
        const shopAddr = settings.company_address || '';
        const shopPhone = settings.company_phone || '';

        const itemsList = (completedBill.items || []).map((i: any) => {
            const name = i.item?.name || 'Item';
            const qty = i.quantity;
            const price = Number(i.price_at_bill).toFixed(2);
            const total = (Number(i.price_at_bill) * qty).toFixed(2);
            return `  ${name}\n    ${qty} x Rs.${price} = Rs.${total}`;
        }).join('\n');

        const subtotal = (completedBill.subtotal || 0).toFixed(2);
        const discount = (completedBill.discount || 0).toFixed(2);
        const vatAmt = (completedBill.vatAmount || completedBill.vat_amount || 0).toFixed(2);
        const ssclAmt = (completedBill.ssclAmount || completedBill.sscl_amount || 0).toFixed(2);
        const total = (completedBill.total_amount || 0).toFixed(2);
        const paid = (completedBill.paid_amount || 0).toFixed(2);
        const balance = (completedBill.balance || 0).toFixed(2);
        const cashier = completedBill.user?.username || 'POS';

        let message = `*${shopName}*\n`;
        if (shopAddr) message += `${shopAddr}\n`;
        if (shopPhone) message += `📞 ${shopPhone}\n`;
        message += `${sep}\n`;
        message += `*Bill #:* ${completedBill.bill_number}\n`;
        message += `*Date:* ${new Date(completedBill.created_at).toLocaleString()}\n`;
        message += `*Cashier:* ${cashier}\n`;
        message += `${sep}\n`;
        message += `*Items:*\n${itemsList}\n`;
        message += `${sep}\n`;
        message += `  Subtotal:  Rs. ${subtotal}\n`;
        if (Number(discount) > 0) message += `  Discount:  -Rs. ${discount}\n`;
        if (Number(vatAmt) > 0) message += `  VAT (18%): Rs. ${vatAmt}\n`;
        if (Number(ssclAmt) > 0) message += `  SSCL(2.5%):Rs. ${ssclAmt}\n`;
        message += `${sep}\n`;
        message += `  *TOTAL:    Rs. ${total}*\n`;
        message += `  Paid:      Rs. ${paid}\n`;
        message += `  Balance:   Rs. ${balance}\n`;
        if (completedBill.earnedPoints > 0) {
            message += `${sep}\n`;
            message += `  * Points Earned: ${completedBill.earnedPoints}\n`;
        }
        if (completedBill.pointsRedeemed > 0) {
            message += `  * Points Redeemed: ${completedBill.pointsRedeemed}\n`;
        }
        message += `${sep}\n`;
        message += `_Thank you for shopping with us!_`;

        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Items Panel */}
                <div className="lg:col-span-3 glass-card p-4">
                    <div className="mb-4 relative">
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            className="input-field pl-10 pr-20" placeholder="Search items..."
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button onClick={() => setIsScannerOpen(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Open Camera Scanner">
                                <FontAwesomeIcon icon={faCamera} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="p-3 rounded-xl border border-gray-100 flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <Skeleton width="60%" height={16} />
                                        <Skeleton width="20%" height={16} />
                                    </div>
                                    <Skeleton width="40%" height={12} />
                                </div>
                            ))
                        ) : filteredItems.map(item => (
                            <button
                                key={String(item.id)}
                                onClick={() => addToCart(item)}
                                className="text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                                disabled={Number(item.stock_quantity) <= 0}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-indigo-600">{String(item.name)}</p>
                                        <p className="text-xs text-gray-400 font-mono">{String(item.plu_code)}</p>
                                    </div>
                                    <p className="font-bold text-indigo-600 text-sm flex-shrink-0">Rs. {Number(item.price).toFixed(2)}</p>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className={`text-xs ${Number(item.stock_quantity) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        Stock: {Number(item.stock_quantity)} {String(item.unit || 'pcs')}
                                    </span>
                                    {Number(item.discount_percentage) > 0 && (
                                        <span className="badge badge-warning text-xs">{Number(item.discount_percentage)}% off</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart Panel */}
                <div className="lg:col-span-2 glass-card p-4 flex flex-col">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FontAwesomeIcon icon={faShoppingCart} className="text-indigo-600" />
                        Cart ({cart.length} items)
                    </h2>

                    <div className="mb-3 space-y-2">
                        {!selectedCustomer ? (
                            <div className="flex gap-1">
                                <div className="relative flex-1">
                                    <input
                                        type="text" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
                                        className="input-field text-sm pl-8" placeholder="Mobile # for Loyalty"
                                    />
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                </div>
                                <button
                                    onClick={handleCustomerSearch}
                                    disabled={searchingCustomer || customerMobile.length < 3}
                                    className="btn-secondary text-xs px-2 whitespace-nowrap"
                                >
                                    {searchingCustomer ? '...' : 'Search'}
                                </button>
                                <Tooltip text="Add New Customer">
                                    <button
                                        onClick={() => {
                                            setForm({ name: '', email: '', phone: customerMobile, loyalty_points: '0' });
                                            setShowRegisterModal(true);
                                        }}
                                        className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                    >
                                        <FontAwesomeIcon icon={faUserPlus} />
                                    </button>
                                </Tooltip>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-indigo-700 truncate">{selectedCustomer.name}</p>
                                    <p className="text-[10px] text-indigo-600 font-mono tracking-tight">{selectedCustomer.phone}</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                        {selectedCustomer.loyalty_points} pts
                                    </span>
                                    <button onClick={() => setSelectedCustomer(null)} className="text-[10px] text-red-400 hover:text-red-600 underline mt-0.5">Change</button>
                                </div>
                            </div>
                        )}
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                            disabled={!!selectedCustomer}
                            className={`input-field text-sm ${selectedCustomer ? 'bg-gray-50 opacity-50' : ''}`} placeholder="Walking Customer Name" />

                        {selectedCustomer && selectedCustomer.loyalty_points >= 100 && (
                            <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                        <FontAwesomeIcon icon={faStar} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-800">Redeem Points</p>
                                        <p className="text-[9px] text-amber-600">Available: {selectedCustomer.loyalty_points}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={redeemPoints}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setAuthModal(prev => ({ ...prev, isOpen: true }));
                                            } else {
                                                setRedeemPoints(false);
                                                setAuthModal({ isOpen: false, username: '', password: '' });
                                            }
                                        }}
                                    />
                                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh]">
                        {cart.map(item => {
                            const conversion = UNIT_CONVERSIONS[item.unit];
                            const currentMultiplier = conversion ? conversion.multipliers[item.display_unit] || 1 : 1;
                            const displayValue = Number((item.quantity * currentMultiplier).toFixed(3).replace(/\.?0+$/, '')); // trim trailing zeros
                            
                            return (
                                <div key={item.item_id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                        <p className="text-xs text-gray-500">Rs. {item.price.toFixed(2)} / {item.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                        <Tooltip text="Decrease">
                                            <button onClick={() => updateQty(item.item_id, item.quantity - (1 / currentMultiplier))} className="w-7 h-7 rounded bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-red-600">
                                                <FontAwesomeIcon icon={faMinus} className="text-[10px]" />
                                            </button>
                                        </Tooltip>
                                        
                                        <div className="flex items-center bg-white rounded shadow-sm overflow-hidden px-1">
                                            <input 
                                                type="number" 
                                                step="any"
                                                min="0.001"
                                                value={displayValue}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) updateQty(item.item_id, val / currentMultiplier);
                                                }}
                                                className="w-12 sm:w-16 text-center text-sm font-semibold text-gray-800 border-none px-0 py-1 focus:ring-0" 
                                            />
                                            {conversion ? (
                                                <select 
                                                    value={item.display_unit} 
                                                    onChange={(e) => {
                                                        const newUnit = e.target.value;
                                                        setCart(cart.map(c => c.item_id === item.item_id ? { ...c, display_unit: newUnit } : c));
                                                    }}
                                                    className="text-xs text-gray-500 bg-gray-50 border-l border-gray-200 py-1.5 px-1 pr-4 focus:ring-0 rounded-none cursor-pointer"
                                                >
                                                    {conversion.available.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-500 bg-gray-50 border-l border-gray-200 py-1.5 px-2">{item.unit}</span>
                                            )}
                                        </div>

                                        <Tooltip text="Increase">
                                            <button onClick={() => updateQty(item.item_id, item.quantity + (1 / currentMultiplier))} className="w-7 h-7 rounded bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-green-600">
                                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <p className="text-sm font-semibold sm:w-20 text-right text-gray-900 mt-2 sm:mt-0">Rs. {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            );
                        })}
                        {cart.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Cart is empty</p>}
                    </div>

                    {/* Totals */}
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">Rs. {subtotal.toFixed(2)}</span></div>
                        {totalDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Discount</span><span>-Rs. {totalDiscount.toFixed(2)}</span></div>}
                        {taxEnabled && vatAmount > 0 && <div className="flex justify-between text-gray-500 text-xs"><span>VAT ({(vatRate * 100).toFixed(1)}%)</span><span>+Rs. {vatAmount.toFixed(2)}</span></div>}
                        {taxEnabled && ssclAmount > 0 && <div className="flex justify-between text-gray-500 text-xs"><span>SSCL ({(ssclRate * 100).toFixed(1)}%)</span><span>+Rs. {ssclAmount.toFixed(2)}</span></div>}
                        {taxEnabled && taxTotal > 0 && <div className="flex justify-between text-gray-600 text-xs font-medium border-t border-dashed border-gray-200 pt-1 mt-1"><span>Tax Total</span><span>+Rs. {taxTotal.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-lg pt-1 text-gray-900"><span>Total</span><span className="text-indigo-600">Rs. {totalAmount.toFixed(2)}</span></div>
                        {pointsDiscount > 0 && (
                            <div className="flex justify-between text-amber-600 font-bold animate-in zoom-in-95">
                                <span>Points Used</span>
                                <span>-Rs. {pointsDiscount.toFixed(2)}</span>
                            </div>
                        )}

                        {(selectedCustomer || earnedPoints > 0) && (
                            <div className="mt-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100 border-dashed flex justify-between items-center">
                                <span className="text-xs font-semibold text-amber-700">Loyalty Points</span>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-amber-600">+{earnedPoints} pts earned</p>
                                    {selectedCustomer && (
                                        <p className="text-[10px] text-amber-500">New Total: {Number(selectedCustomer.loyalty_points) + earnedPoints} pts</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 space-y-2">
                        <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                            className="input-field text-sm" placeholder="Paid Amount" step="0.01" />
                        {balance > 0 && <p className="text-sm text-green-600 font-semibold">Change: Rs. {balance.toFixed(2)}</p>}
                        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                            className="input-field text-sm" placeholder="Remarks (optional)" />
                        <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                            className="btn-primary w-full justify-center py-3">
                            {submitting ? 'Processing...' : '✓ Complete Sale'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Post-Billing Modal */}
            <Modal isOpen={!!completedBill && !emailPrompt.isOpen} onClose={() => setCompletedBill(null)} title="Bill Created Successfully">
                <div className="space-y-4 text-center pb-4">
                    <div className="text-5xl mb-2 text-green-500"><FontAwesomeIcon icon={faCheckCircle} /></div>
                    <h3 className="text-xl font-bold text-gray-900">Bill #{completedBill?.bill_number}</h3>
                    {completedBill?.earnedPoints > 0 && (
                        <div className="inline-block px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-bold border border-amber-100">
                            <FontAwesomeIcon icon={faStar} className="mr-1 text-amber-500" /> {completedBill.earnedPoints} Points Earned
                        </div>
                    )}
                    <p className="text-gray-500 text-sm mb-6">What would you like to do next?</p>
                    <div className="flex flex-wrap justify-center gap-3">

                        {thermalPrinter.isConnected && (
                            <button onClick={async () => {
                                const billItems = (completedBill.items || []).map((i: any) => ({
                                    name: i.item?.name || 'Item',
                                    qty: String(i.quantity),
                                    price: Number(i.price_at_bill).toFixed(2),
                                    total: (Number(i.price_at_bill) * i.quantity).toFixed(2),
                                }));
                                await thermalPrinter.printReceipt({
                                    shopName: settings.company_name || 'INSOPHINIA POS',
                                    shopAddress: settings.company_address || '',
                                    shopPhone: settings.company_phone || '',
                                    billNumber: completedBill.bill_number,
                                    date: new Date(completedBill.created_at).toLocaleDateString(),
                                    time: new Date(completedBill.created_at).toLocaleTimeString(),
                                    cashier: completedBill.user?.username || 'POS',
                                    items: billItems,
                                    subtotal: (completedBill.subtotal || 0).toFixed(2),
                                    vatAmount: (completedBill.vatAmount || completedBill.vat_amount || 0).toFixed(2),
                                    ssclAmount: (completedBill.ssclAmount || completedBill.sscl_amount || 0).toFixed(2),
                                    taxTotal: (completedBill.taxTotal || completedBill.tax_total || 0).toFixed(2),
                                    discount: (completedBill.discount || 0).toFixed(2),
                                    total: (completedBill.total_amount || 0).toFixed(2),
                                    paid: (completedBill.paid_amount || 0).toFixed(2),
                                    change: (completedBill.balance || 0).toFixed(2),
                                    pointsEarned: completedBill.earnedPoints,
                                    pointsRedeemed: completedBill.pointsRedeemed,
                                });
                                showToast('Receipt printed!', 'success');
                            }} className="btn-primary bg-emerald-600 border-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] py-3 justify-center items-center gap-2">
                                <FontAwesomeIcon icon={faBolt} /> Direct Print
                            </button>
                        )}
                        <button onClick={() => {
                            const printUrl = `/api/billing/${completedBill.id}/print${profile?.defaultPrinter === 'thermal' ? '?type=thermal' : ''}`;
                            const printWindow = window.open(printUrl, '_blank');
                            if (printWindow) {
                                printWindow.onload = () => {
                                    printWindow.print();
                                };
                            }
                        }} className="btn-secondary flex-1 min-w-[140px] py-3 justify-center items-center gap-2">
                            <FontAwesomeIcon icon={faPrint} /> Print Receipt
                        </button>
                        <button onClick={() => { setEmailPrompt({ isOpen: true, email: selectedCustomer?.email || '', sending: false }); }} className="btn-primary flex-1 min-w-[140px] py-3 justify-center items-center gap-2">
                            <FontAwesomeIcon icon={faEnvelope} /> Email Receipt
                        </button>
                        <button onClick={shareToWhatsApp} className="btn-primary bg-green-600 border-green-600 hover:bg-green-700 flex-1 min-w-[140px] py-3 justify-center items-center gap-2">
                            <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
                        </button>
                    </div>
                    <button onClick={() => setCompletedBill(null)} className="text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors mt-6 block w-full">
                        Start New Bill
                    </button>
                </div>
            </Modal>

            {/* Registration Modal */}
            <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Register New Member">
                <form onSubmit={handleRegisterCustomer} className="space-y-4">
                    <p className="text-sm text-gray-500 italic pb-2 border-b border-gray-100">Quickly register a new member for loyalty points and tracking.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required placeholder="Customer Full Name" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="customer@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone *</label>
                            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" required placeholder="07XXXXXXXX" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Loyalty Points (Initial)</label>
                            <input type="number" value={form.loyalty_points} onChange={e => setForm({ ...form, loyalty_points: e.target.value })} className="input-field" placeholder="0" />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4">
                        <button type="submit" className="btn-primary flex-1 min-w-[120px] justify-center py-3">Register & Select</button>
                        <button type="button" onClick={() => setShowRegisterModal(false)} className="btn-secondary flex-1 min-w-[120px] py-3 justify-center">Cancel</button>
                    </div>
                </form>
            </Modal>

            {/* Email Prompt Modal */}
            <Modal isOpen={emailPrompt.isOpen} onClose={() => setEmailPrompt({ ...emailPrompt, isOpen: false })} title="Email Receipt">
                <div className="space-y-4 text-left">
                    <p className="text-sm text-gray-600">Enter the customer's email address to send the receipt for Bill #{completedBill?.bill_number}:</p>
                    <input type="email" value={emailPrompt.email} onChange={e => setEmailPrompt({ ...emailPrompt, email: e.target.value })} className="input-field w-full" placeholder="customer@example.com" />
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setEmailPrompt({ ...emailPrompt, isOpen: false })} className="btn-secondary">Cancel</button>
                        <button
                            disabled={emailPrompt.sending}
                            className="btn-primary"
                            onClick={async () => {
                                if (!emailPrompt.email || !emailPrompt.email.includes('@')) return showToast('Enter a valid email address', 'error');
                                setEmailPrompt({ ...emailPrompt, sending: true });
                                const res = await apiFetch(`/api/billing/${completedBill?.id}/email`, {
                                    method: 'POST', body: JSON.stringify({ email: emailPrompt.email })
                                });
                                setEmailPrompt({ ...emailPrompt, sending: false, isOpen: false });
                                if (res.success) { showToast('Receipt sent successfully!', 'success'); }
                                else { showToast(res.message || 'Failed to send receipt', 'error'); }
                            }}
                        >
                            {emailPrompt.sending ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScan}
            />
            {/* Point Redemption Authorization Modal */}
            {authModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                <FontAwesomeIcon icon={faLock} />
                            </div>
                            <h3 className="text-xl font-bold">Supervisor Approval</h3>
                            <p className="text-amber-50 text-sm mt-1 opacity-90">Authorization required for point redemption</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Supervisor Username</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Username"
                                    value={authModal.username}
                                    onChange={e => setAuthModal(prev => ({ ...prev, username: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Passcode / Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={authModal.password}
                                    onChange={e => setAuthModal(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setAuthModal({ isOpen: false, username: '', password: '' });
                                        setRedeemPoints(false);
                                    }}
                                    className="btn-secondary flex-1 min-w-[120px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (authModal.username && authModal.password) {
                                            setRedeemPoints(true);
                                            setAuthModal(prev => ({ ...prev, isOpen: false }));
                                        } else {
                                            showToast('Please enter credentials', 'error');
                                        }
                                    }}
                                    className="btn-primary flex-1 min-w-[120px] bg-amber-600 border-amber-600 hover:bg-amber-700"
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
