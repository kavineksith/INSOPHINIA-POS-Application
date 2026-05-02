'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faKey, faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function Verify2FAContent() {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { verify2FA } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const pendingToken = localStorage.getItem('pending_2fa_token');
        if (!pendingToken) {
            router.push('/login');
        }
        // Focus first input
        inputRefs.current[0]?.focus();
    }, [router]);

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pasted.length; i++) {
            newCode[i] = pasted[i];
        }
        setCode(newCode);
        if (pasted.length === 6) {
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const verificationCode = useBackup ? backupCode : code.join('');
            if (!verificationCode || (!useBackup && verificationCode.length !== 6)) {
                setError('Please enter a valid code');
                setIsLoading(false);
                return;
            }

            const result = await verify2FA(verificationCode, useBackup);
            if (result.success) {
                showToast('Verification successful!', 'success');
                const redirect = searchParams.get('redirect') || '/dashboard';
                router.push(result.must_change_password ? '/change-password' : redirect);
            } else {
                setError(result.message || 'Invalid code');
            }
        } catch {
            setError('Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-['Inter']">
            {/* Left Side: Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

                <div className="relative z-10 text-center px-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 border border-white/20 mb-8 shadow-2xl">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-3xl text-emerald-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
                        Two-Factor<br />Authentication
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                        Your account is protected with an extra layer of security.
                    </p>
                </div>

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            </div>

            {/* Right Side: 2FA Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-4">
                                <FontAwesomeIcon icon={useBackup ? faKey : faShieldAlt} className="text-2xl text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {useBackup ? 'Backup Code' : 'Enter Verification Code'}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {useBackup
                                    ? 'Enter one of your backup codes'
                                    : 'Enter the 6-digit code from your authenticator app'
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {useBackup ? (
                                <div className="mb-6">
                                    <input
                                        id="backup-code"
                                        type="text"
                                        value={backupCode}
                                        onChange={e => setBackupCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-center text-lg tracking-widest font-mono placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                        placeholder="XXXX-XXXX"
                                        maxLength={9}
                                        autoComplete="off"
                                    />
                                </div>
                            ) : (
                                <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
                                    {code.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => { inputRefs.current[index] = el; }}
                                            id={`code-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleCodeChange(index, e.target.value)}
                                            onKeyDown={e => handleKeyDown(index, e)}
                                            className="w-13 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                            autoComplete="off"
                                        />
                                    ))}
                                </div>
                            )}

                            <button
                                id="verify-submit"
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Verify</span>
                                        <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                onClick={() => { setUseBackup(!useBackup); setError(''); }}
                                className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
                            >
                                {useBackup ? '← Use authenticator app' : 'Use a backup code instead'}
                            </button>

                            <button
                                onClick={() => {
                                    localStorage.removeItem('pending_2fa_token');
                                    router.push('/login');
                                }}
                                className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                                Back to login
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-slate-400 text-xs font-medium tracking-widest uppercase">
                        Two-Factor Authentication • Secure Access
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Verify2FAPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <Verify2FAContent />
        </Suspense>
    );
}
