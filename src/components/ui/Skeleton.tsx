'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

export function Skeleton({ className = '', width, height, circle }: SkeletonProps) {
    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: circle ? '50%' : '8px',
    };

    return (
        <div
            className={`skeleton ${className}`}
            style={style}
        />
    );
}
