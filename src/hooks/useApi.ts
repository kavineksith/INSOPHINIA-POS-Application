"use client";

import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

const getCsrfToken = () => {
    if (typeof document === 'undefined') return '';
    const name = 'csrf_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return '';
};

export function useApi() {
    const { token, logout } = useAuth();

    const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
            ...(options.headers as Record<string, string> || {}),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
            logout();
            throw new Error('Session expired');
        }

        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        // For JSON responses (both success and error), return the parsed body
        // so callers can check `res.success` and `res.message` consistently
        if (isJson) {
            return res.json();
        }

        // Non-JSON error responses (e.g. HTML error pages from hosting providers)
        if (!res.ok) {
            const text = await res.text();
            if (res.status === 500) {
                throw new Error('Internal Server Error. Please check server logs.');
            }
            throw new Error(text.slice(0, 100) || `Request failed with status ${res.status}`);
        }

        throw new Error('Unexpected response format from server');
    }, [token, logout]);

    const get = useCallback((url: string) => apiFetch(url), [apiFetch]);

    const post = useCallback((url: string, body?: unknown) =>
        apiFetch(url, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),
        [apiFetch]);

    const put = useCallback((url: string, body?: unknown) =>
        apiFetch(url, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),
        [apiFetch]);

    const del = useCallback((url: string) =>
        apiFetch(url, { method: 'DELETE' }),
        [apiFetch]);

    return useMemo(() => ({ apiFetch, get, post, put, del }), [apiFetch, get, post, put, del]);
}
