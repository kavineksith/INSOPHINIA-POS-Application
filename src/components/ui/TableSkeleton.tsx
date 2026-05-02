'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
    hasHeader?: boolean;
}

export function TableSkeleton({ rows = 5, cols = 4, hasHeader = true }: TableSkeletonProps) {
    return (
        <div className="w-full overflow-hidden animate-in fade-in">
            <table className="data-table">
                {hasHeader && (
                    <thead>
                        <tr>
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i}>
                                    <Skeleton width="60%" height={16} className="opacity-50" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                )}
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: cols }).map((_, colIndex) => (
                                <td key={colIndex}>
                                    <Skeleton
                                        width={colIndex === 0 ? "80%" : "60%"}
                                        height={16}
                                        className={colIndex === 0 ? "opacity-30" : "opacity-20"}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
