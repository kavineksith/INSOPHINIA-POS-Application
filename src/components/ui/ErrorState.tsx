import React from "react";
import Link from "next/link";

interface ErrorStateProps {
  statusCode: string | number;
  title: string;
  description: string;
  iconSvg: React.ReactNode;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function ErrorState({
  statusCode,
  title,
  description,
  iconSvg,
  actionText = "Go back home",
  actionHref = "/",
  onAction,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 px-6 py-24 sm:py-32 lg:px-8">
      <div className="relative max-w-lg w-full text-center">
        {/* Decorative background blur */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-10 shadow-2xl overflow-hidden">
          {/* Status Code Background Graphic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] font-black text-indigo-50/50 dark:text-slate-700/20 pointer-events-none select-none z-0 tracking-tighter mix-blend-overlay">
            {statusCode}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-8 ring-8 ring-indigo-50 dark:ring-slate-800/50">
              {iconSvg}
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">
              {description}
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              {onAction ? (
                <button
                  onClick={onAction}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 active:scale-95"
                >
                  {actionText}
                </button>
              ) : (
                <Link
                  href={actionHref}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 active:scale-95"
                >
                  {actionText}
                </Link>
              )}
              
              {!onAction && (
                <Link
                  href="/contact"
                  className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Contact support <span aria-hidden="true">&rarr;</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
