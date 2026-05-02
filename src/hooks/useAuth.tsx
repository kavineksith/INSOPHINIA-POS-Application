'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    must_change_password: boolean;
    two_factor_enabled?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<{
        success: boolean;
        must_change_password?: boolean;
        requires_2fa?: boolean;
        message?: string;
    }>;
    verify2FA: (code: string, isBackup?: boolean) => Promise<{
        success: boolean;
        must_change_password?: boolean;
        message?: string;
    }>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
            // Check if 2FA is required
            if (data.requires_2fa) {
                // Store pending token for 2FA verification
                localStorage.setItem('pending_2fa_token', data.data.pending_token);
                return { success: true, requires_2fa: true };
            }

            // Normal login (no 2FA)
            setToken(data.data.token);
            setUser(data.data.user);
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.data.user));
            return { success: true, must_change_password: data.data.user.must_change_password };
        }
        return { success: false, message: data.message };
    }, []);

    const verify2FA = useCallback(async (code: string, isBackup: boolean = false) => {
        const pendingToken = localStorage.getItem('pending_2fa_token');
        if (!pendingToken) {
            return { success: false, message: 'No pending 2FA session. Please login again.' };
        }

        const res = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify({
                code,
                pending_token: pendingToken,
                is_backup_code: isBackup,
            }),
        });
        const data = await res.json();

        if (data.success && data.data?.token) {
            // 2FA verified, complete login
            localStorage.removeItem('pending_2fa_token');
            setToken(data.data.token);
            setUser(data.data.user);
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.data.user));
            return { success: true, must_change_password: data.data.user.must_change_password };
        }
        return { success: false, message: data.message };
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-Token': getCsrfToken()
                },
            });
        } catch { /* ignore */ }
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('pending_2fa_token');
        window.location.href = '/login';
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, login, verify2FA, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
