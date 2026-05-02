"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faShieldAlt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { user, token, logout } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!token) router.push('/login');
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                }),
            });
            const data = await res.json();

            if (data.success) {
                showToast('Password changed successfully! Please log in with your new password.', 'success');
                // Log out after password change for security
                setTimeout(() => logout(), 2000);
            } else {
                setError(data.message || 'Failed to change password');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4 text-amber-400">
                        <FontAwesomeIcon icon={faShieldAlt} size="2x" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Security Update Required</h1>
                    <p className="text-indigo-200 text-sm">For your security, you must change your password before continuing.</p>
                </div>

                <div className="bg-slate-800/80 rounded-2xl border border-white/10 p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <PasswordInput
                            label="Current Password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="bg-white/5 border-white/10 text-white placeholder-indigo-300/40 focus:border-indigo-400 focus:ring-indigo-400/20 font-['Inter']"
                        />

                        <div className="space-y-4">
                            <PasswordInput
                                label="New Password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                minLength={12}
                                maxLength={30}
                                autoComplete="new-password"
                                className="bg-white/5 border-white/10 text-white placeholder-indigo-300/40 focus:border-indigo-400 focus:ring-indigo-400/20 font-['Inter']"
                            />
                            <PasswordInput
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                className="bg-white/5 border-white/10 text-white placeholder-indigo-300/40 focus:border-indigo-400 focus:ring-indigo-400/20 font-['Inter']"
                            />
                        </div>

                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[10px] text-indigo-300 space-y-1">
                            <p className="font-semibold uppercase tracking-wider">Password Requirements:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Minimum 8 characters</li>
                                <li>Include uppercase and lowercase letters</li>
                                <li>Include at least one number and special character</li>
                            </ul>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faLock} />
                                    Change Password
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
