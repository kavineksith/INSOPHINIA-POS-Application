'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import Tooltip from './Tooltip';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
}: PaginationProps) {
    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalItems);

    return (
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-4 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm mt-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4 order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                        {[10, 25, 50, 100].map(val => (
                            <option key={val} value={val}>{val}</option>
                        ))}
                    </select>
                </div>
                <div className="hidden sm:block text-gray-500 font-medium">
                    Showing <span className="text-gray-900">{totalItems === 0 ? 0 : startItem}-{endItem}</span> of <span className="text-gray-900">{totalItems}</span> items
                </div>
            </div>

            <div className="flex items-center gap-1 order-1 sm:order-2 w-full sm:w-auto justify-center">
                <Tooltip text="First Page">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                    </button>
                </Tooltip>
                <Tooltip text="Previous Page">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                </Tooltip>

                <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold mx-1 sm:mx-2 space-x-1">
                    <span>Page</span>
                    <span className="bg-white px-2 rounded shadow-sm text-indigo-900">{currentPage}</span>
                    <span className="text-indigo-400">of</span>
                    <span>{totalPages || 1}</span>
                </div>

                <Tooltip text="Next Page">
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || totalPages === 0}
                        className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </Tooltip>
                <Tooltip text="Last Page">
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage >= totalPages || totalPages === 0}
                        className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
