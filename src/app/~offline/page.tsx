'use client';

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414 1 1 0 01-1.414-1.414z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">You&apos;re Offline</h1>
                <p className="text-indigo-200/70 text-sm leading-relaxed mb-8">
                    INSOPHINIA POS requires an internet connection.
                    Please check your WiFi or mobile data and try again.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    Try Again
                </button>
                <p className="text-indigo-400/40 text-xs mt-8 font-mono">INSOPHINIA POS v1.8.0</p>
            </div>
        </div>
    );
}
