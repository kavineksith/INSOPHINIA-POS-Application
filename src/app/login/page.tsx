'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faArrowRight, faShieldAlt, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import PasswordInput from '@/components/ui/PasswordInput';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                if (result.requires_2fa) {
                    showToast('2FA verification required', 'info');
                    router.push('/verify-2fa');
                } else if (result.must_change_password) {
                    showToast('Login successful!', 'success');
                    router.push('/change-password');
                } else {
                    showToast('Login successful!', 'success');
                    router.push('/dashboard');
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err: any) {
            alert('A critical communication error occurred: ' + err.message);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-['Inter']">
            {/* Left Side: Animation & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center">
                {/* Animated Background Blobs */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

                <div className="relative z-10 text-center px-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 border border-white/20 mb-8 shadow-2xl">
                        <FontAwesomeIcon icon={faShoppingCart} className="text-3xl text-white" />
                    </div>
                    <h1 className="text-6xl font-black text-white mb-6 tracking-tighter">
                        INSOPH<span className="text-indigo-500">INIA</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                        Experience the next generation of Point-of-Sale management.
                        Sleek, secure, and built for modern business.
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-6 text-slate-500">
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faShieldAlt} className="text-indigo-500" />
                            <span className="text-sm font-medium">Enterprise Grade Security</span>
                        </div>
                    </div>
                </div>

                {/* Background Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    <div className="text-center lg:hidden mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">INSOPHINIA</h1>
                    </div>

                    <div className="bg-white rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                            <p className="text-slate-500">Sign in to manage your workstation</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                    <input
                                        id="login-username"
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        placeholder="Enter your username"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <PasswordInput
                                label="Password"
                                id="login-password"
                                icon={faLock}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                                className="bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all py-4"
                            />

                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-12 text-center text-slate-400 text-xs font-medium tracking-widest uppercase">
                        Enterprise Edition 4.0 • Secure POS Core
                    </div>
                </div>
            </div>
        </div>
    );
}
