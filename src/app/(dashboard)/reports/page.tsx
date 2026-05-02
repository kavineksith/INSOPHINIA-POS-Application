'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faCalendarAlt, faUser, faExclamationTriangle, faSync, faFilePdf, faFileCsv, faFileCode, faDownload } from '@fortawesome/free-solid-svg-icons';
import Pagination from '@/components/ui/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Skeleton } from '@/components/ui/Skeleton';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function ReportsPage() {
    const { apiFetch } = useApi();
    const { showToast } = useToast();
    const [report, setReport] = useState<Record<string, any> | null>(null);
    const [itemsReport, setItemsReport] = useState<Record<string, any> | null>(null);
    const [activeTab, setActiveTab] = useState<'sales' | 'insights'>('sales');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [staff, setStaff] = useState<any[]>([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [paginationMetadata, setPaginationMetadata] = useState<any>(null);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedStaff, setSelectedStaff] = useState('all');

    const fetchStaff = () => {
        apiFetch('/api/users').then(res => {
            if (res.success) setStaff(res.data);
        }).catch(() => {
            // Silently fail if not admin or error
        });
    };

    const fetchReport = useCallback((currentPage = page, currentLimit = limit) => {
        setLoading(true);
        const url = `/api/reports/sales?start_date=${startDate}&end_date=${endDate}${selectedStaff !== 'all' ? `&staff_id=${selectedStaff}` : ''}&page=${currentPage}&limit=${currentLimit}`;
        const itemsUrl = `/api/reports/items?start_date=${startDate}&end_date=${endDate}`;

        Promise.all([
            apiFetch(url),
            apiFetch(itemsUrl)
        ]).then(([salesRes, itemsRes]) => {
            if (salesRes.success) {
                setReport(salesRes.data);
                setPaginationMetadata(salesRes.data.pagination);
            }
            if (itemsRes.success) {
                setItemsReport(itemsRes.data);
            }
        }).catch(err => {
            showToast('An unexpected error occurred', 'error');
            console.error(err);
        }).finally(() => setLoading(false));
    }, [startDate, endDate, selectedStaff, page, limit, apiFetch, showToast]);

    useEffect(() => {
        fetchStaff();
        fetchReport(1); // Reset to page 1 on filter change
    }, [startDate, endDate, selectedStaff]);

    useEffect(() => {
        fetchReport(page, limit);
    }, [page, limit]);

    // Export Handlers
    const getExportData = async () => {
        let allBills: any[] = [];
        let page = 1;
        const limit = 500; // Chunk size
        let totalPages = 1;
        let summary = null;

        try {
            while (page <= totalPages) {
                const url = `/api/reports/sales?start_date=${startDate}&end_date=${endDate}${selectedStaff !== 'all' ? `&staff_id=${selectedStaff}` : ''}&page=${page}&limit=${limit}`;
                const res = await apiFetch(url);
                
                if (!res.success) throw new Error('Failed to fetch data');
                
                allBills = [...allBills, ...res.data.bills];
                totalPages = res.data.pagination.pages;
                summary = res.data.summary;
                page++;
                
                // Safety break for extremely large datasets
                if (page > 50) break;
            }
            return { bills: allBills, summary };
        } catch (error) {
            console.error('Export fetch error:', error);
            return null;
        }
    };

    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            const data = await getExportData();
            if (!data || data.bills.length === 0) {
                showToast('No data found for the selected period', 'warning');
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(63, 81, 181);
            doc.text('Sales Performance Report', 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
            doc.text(`Staff: ${selectedStaff === 'all' ? 'All Staff' : staff.find(s => s.id === selectedStaff)?.firstName || selectedStaff}`, 14, 40);

            doc.setDrawColor(230);
            doc.line(14, 45, 196, 45);

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Total Sales: Rs. ${data.summary.total_sales.toLocaleString()}`, 14, 55);
            doc.text(`Total Bills: ${data.summary.total_bills}`, 80, 55);
            doc.text(`Avg Bill: Rs. ${data.summary.average_bill.toFixed(2)}`, 140, 55);

            autoTable(doc, {
                startY: 65,
                head: [['Bill #', 'Customer', 'Staff', 'Amount (Rs.)', 'Discount (Rs.)', 'Date']],
                body: data.bills.map((b: any) => [
                    b.bill_number,
                    b.customer_name,
                    b.staff_name,
                    Number(b.total_amount).toFixed(2),
                    Number(b.total_discount).toFixed(2),
                    new Date(b.created_at).toLocaleDateString()
                ]),
                headStyles: { fillColor: [63, 81, 181], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 247, 255] },
            });

            doc.save(`Sales_Report_${startDate}_${endDate}.pdf`);
            showToast('PDF Report exported successfully', 'success');
        } catch (error) {
            showToast('Failed to export PDF', 'error');
        } finally {
            setExporting(null);
        }
    };

    const handleExportCSV = async () => {
        setExporting('csv');
        try {
            const data = await getExportData();
            if (!data || data.bills.length === 0) {
                showToast('No data found for the selected period', 'warning');
                return;
            }

            const headers = ['Bill Number', 'Customer Name', 'Staff Name', 'Subtotal', 'Discount', 'Total Amount', 'Date'];
            const rows = data.bills.map((b: any) => [
                b.bill_number,
                `"${b.customer_name}"`,
                `"${b.staff_name}"`,
                b.subtotal,
                b.total_discount,
                b.total_amount,
                new Date(b.created_at).toISOString()
            ]);

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Sales_Report_${startDate}_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('CSV Exported successfully', 'success');
        } catch (error) {
            showToast('Failed to export CSV', 'error');
        } finally {
            setExporting(null);
        }
    };

    const handleExportJSON = async () => {
        setExporting('json');
        try {
            const data = await getExportData();
            if (!data || data.bills.length === 0) {
                showToast('No data found for the selected period', 'warning');
                return;
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Sales_Report_${startDate}_${endDate}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('JSON Exported successfully', 'success');
        } catch (error) {
            showToast('Failed to export JSON', 'error');
        } finally {
            setExporting(null);
        }
    };

    const summary = report?.summary;
    const bills = report?.bills || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <FontAwesomeIcon icon={faChartLine} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
                        <p className="text-sm text-gray-500">Analyze your business performance and trends</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={!!exporting || loading || bills.length === 0}
                        className="btn-secondary h-10 px-4 text-xs font-bold flex items-center gap-2 bg-white border-red-100 text-red-600 hover:bg-red-50"
                    >
                        <FontAwesomeIcon icon={exporting === 'pdf' ? faSync : faFilePdf} className={exporting === 'pdf' ? 'animate-spin' : ''} />
                        {exporting === 'pdf' ? 'Preparing...' : 'Export PDF'}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={!!exporting || loading || bills.length === 0}
                        className="btn-secondary h-10 px-4 text-xs font-bold flex items-center gap-2 bg-white border-green-100 text-green-600 hover:bg-green-50"
                    >
                        <FontAwesomeIcon icon={exporting === 'csv' ? faSync : faFileCsv} className={exporting === 'csv' ? 'animate-spin' : ''} />
                        CSV
                    </button>
                    <button
                        onClick={handleExportJSON}
                        disabled={!!exporting || loading || bills.length === 0}
                        className="btn-secondary h-10 px-4 text-xs font-bold flex items-center gap-2 bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                    >
                        <FontAwesomeIcon icon={exporting === 'json' ? faSync : faFileCode} className={exporting === 'json' ? 'animate-spin' : ''} />
                        JSON
                    </button>
                </div>
            </div>

            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'sales' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Sales Overview</button>
                <button onClick={() => setActiveTab('insights')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'insights' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Item & Promo Insights</button>
            </div>

            <div className="glass-card p-4 flex flex-wrap gap-4 items-end bg-white border border-gray-200 shadow-sm">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" /> Start Date
                    </label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-full" />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" /> End Date
                    </label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-full" />
                </div>
                {staff.length > 0 && (
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <FontAwesomeIcon icon={faUser} className="text-[10px]" /> Staff member
                        </label>
                        <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="input-field w-full">
                            <option value="all">All Staff</option>
                            {staff.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button
                    onClick={() => fetchReport(1, limit)}
                    disabled={loading}
                    className={`btn-primary px-8 h-[42px] flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Generating...' : 'Refresh Report'}
                </button>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && !report ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="stat-card bg-white shadow-sm">
                            <Skeleton width="40%" height={12} />
                            <Skeleton width="80%" height={24} className="mt-2" />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="stat-card border-l-4 border-green-500 bg-white shadow-sm group hover:shadow-md transition-all">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sales</p>
                            <p className="text-2xl font-black text-green-600 mt-1">Rs. {Number(summary?.total_sales || 0).toLocaleString()}</p>
                            <div className="h-1 w-0 group-hover:w-full bg-green-500 transition-all duration-300 mt-2" />
                        </div>
                        <div className="stat-card border-l-4 border-indigo-500 bg-white shadow-sm group hover:shadow-md transition-all">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Bills</p>
                            <p className="text-2xl font-black text-gray-800 mt-1">{Number(summary?.total_bills || 0)}</p>
                            <div className="h-1 w-0 group-hover:w-full bg-indigo-500 transition-all duration-300 mt-2" />
                        </div>
                        <div className="stat-card border-l-4 border-blue-500 bg-white shadow-sm group hover:shadow-md transition-all">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Bill</p>
                            <p className="text-2xl font-black text-blue-600 mt-1">Rs. {Number(summary?.average_bill || 0).toFixed(2).toLocaleString()}</p>
                            <div className="h-1 w-0 group-hover:w-full bg-blue-500 transition-all duration-300 mt-2" />
                        </div>
                        <div className="stat-card border-l-4 border-amber-500 bg-white shadow-sm group hover:shadow-md transition-all">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Discount</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">Rs. {Number(summary?.total_discount || 0).toFixed(2).toLocaleString()}</p>
                            <div className="h-1 w-0 group-hover:w-full bg-amber-500 transition-all duration-300 mt-2" />
                        </div>
                    </>
                )}
            </div>

            {activeTab === 'sales' ? (
                <div className="glass-card overflow-hidden bg-white border border-gray-100 shadow-xl rounded-2xl">
                    {loading ? <TableSkeleton rows={limit} cols={6} /> : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="data-table min-w-[800px]">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="py-4 px-6 text-left">Bill #</th>
                                            <th className="py-4 px-6 text-left">Customer</th>
                                            <th className="py-4 px-6 text-left">Staff</th>
                                            <th className="py-4 px-6 text-right">Amount</th>
                                            <th className="py-4 px-6 text-right">Discount</th>
                                            <th className="py-4 px-6 text-center">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {bills.map((b: any) => (
                                            <tr key={String(b.id)} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 px-6 font-mono text-sm text-indigo-600 font-bold">{String(b.bill_number)}</td>
                                                <td className="py-4 px-6 font-medium text-gray-800">{String(b.customer_name)}</td>
                                                <td className="py-4 px-6 text-gray-600">{String(b.staff_name)}</td>
                                                <td className="py-4 px-6 text-right font-black text-gray-800 text-lg">Rs. {Number(b.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-4 px-6 text-right text-green-600 font-medium">{Number(b.total_discount) > 0 ? `Rs. ${Number(b.total_discount).toFixed(2)}` : '-'}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold">
                                                        {new Date(String(b.created_at)).toLocaleDateString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {bills.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-20">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400 text-3xl" />
                                                        <p className="text-gray-400 font-medium text-lg">No sales found in this period</p>
                                                        <p className="text-gray-300 text-sm italic">Try adjusting the date range or filters</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {paginationMetadata && paginationMetadata.total > 0 && (
                                <Pagination
                                    currentPage={page}
                                    totalPages={paginationMetadata.pages}
                                    totalItems={paginationMetadata.total}
                                    rowsPerPage={limit}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(rows) => { setLimit(rows); setPage(1); }}
                                />
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Items */}
                        <div className="glass-card p-6 bg-white overflow-hidden shadow-lg border border-indigo-50">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                                Top Selling Items
                            </h3>
                            <div className="space-y-4">
                                {itemsReport?.top_items.map((item: any) => (
                                    <div key={item.id} className="relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-semibold text-gray-700">{item.name} <span className="text-xs text-gray-400 font-normal">({item.plu_code})</span></span>
                                            <span className="text-xs font-bold text-indigo-600">{item.quantity} sold</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000"
                                                style={{ width: `${(item.quantity / (itemsReport.top_items[0]?.quantity || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-right text-[10px] text-gray-400 mt-1">Revenue: Rs. {Number(item.revenue).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Promo Impact */}
                        <div className="space-y-6">
                            <div className="glass-card p-6 bg-white shadow-lg border border-green-50">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-green-500 rounded-full" />
                                    Promotion Performance
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 rounded-xl">
                                        <p className="text-[10px] font-bold text-green-600 uppercase">Promoted Items Sold</p>
                                        <p className="text-2xl font-black text-green-700">{itemsReport?.impact.promoted_quantity}</p>
                                        <p className="text-[10px] text-green-500 mt-1">{((itemsReport?.impact.promoted_quantity / (itemsReport?.impact.promoted_quantity + itemsReport?.impact.regular_quantity || 1)) * 100).toFixed(1)}% of total volume</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 rounded-xl">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase">Total Discount Value</p>
                                        <p className="text-2xl font-black text-indigo-700">Rs. {Number(itemsReport?.impact.total_discount_given).toLocaleString()}</p>
                                        <p className="text-[10px] text-indigo-400 mt-1">Impact on margin</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6 bg-white shadow-lg border border-amber-50">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-amber-500 rounded-full" />
                                    Sales Mix
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                                        <div
                                            className="h-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                                            style={{ width: `${(itemsReport?.impact.promoted_revenue / (itemsReport?.impact.promoted_revenue + itemsReport?.impact.regular_revenue || 1)) * 100}%` }}
                                        >
                                            Promotions
                                        </div>
                                        <div
                                            className="h-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                                            style={{ width: `${(itemsReport?.impact.regular_revenue / (itemsReport?.impact.promoted_revenue + itemsReport?.impact.regular_revenue || 1)) * 100}%` }}
                                        >
                                            Regular
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 text-[11px]">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full" /> Promoted Revenue: Rs. {Number(itemsReport?.impact.promoted_revenue).toLocaleString()}</div>
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full" /> Regular Revenue: Rs. {Number(itemsReport?.impact.regular_revenue).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
