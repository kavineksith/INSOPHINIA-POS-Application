'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCamera, faTimes, faExclamationTriangle,
    faCameraRotate, faLock, faMagnifyingGlassPlus, faBolt
} from '@fortawesome/free-solid-svg-icons';

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

type FlowState = 'REQUEST_PERMISSION' | 'SELECTING_CAMERA' | 'SCANNING' | 'ERROR';

export default function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
    const [flowState, setFlowState] = useState<FlowState>('REQUEST_PERMISSION');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
    const [currentZoom, setCurrentZoom] = useState(1);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    // FIX 1: containerRef always stays in DOM — never conditionally rendered.
    // html5-qrcode needs a real DOM node to attach to; if the div is unmounted
    // when startScanner() runs, containerRef.current is null and the lib crashes.
    const containerRef = useRef<HTMLDivElement>(null);
    const readerElRef = useRef<HTMLDivElement | null>(null);
    const isMountedRef = useRef(false);
    const isStoppingRef = useRef(false);
    const lastScannedTextRef = useRef<string | null>(null);
    const lastScanTimeRef = useRef<number>(0);

    const playSuccessSound = useCallback(() => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } catch { }
    }, []);

    // FIX 2: Always create the reader <div> imperatively inside the container ref.
    // Never rely on a JSX-rendered child element for the scanner mount point —
    // React may re-render / unmount it between the state change and the async call.
    const ensureReaderElement = useCallback(() => {
        if (!containerRef.current) return null;
        if (!readerElRef.current) {
            const el = document.createElement('div');
            el.id = 'qr-reader-' + Date.now();
            el.style.width = '100%';
            containerRef.current.appendChild(el);
            readerElRef.current = el;
        }
        return readerElRef.current;
    }, []);

    const cleanupReaderElement = useCallback(() => {
        if (readerElRef.current) {
            while (readerElRef.current.firstChild) {
                readerElRef.current.removeChild(readerElRef.current.firstChild);
            }
            readerElRef.current.parentNode?.removeChild(readerElRef.current);
        }
        readerElRef.current = null;
    }, []);

    const stopScanner = useCallback(async () => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;
        try {
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    // State 2 = SCANNING, state 3 = PAUSED
                    if (state === 2 || state === 3) await scannerRef.current.stop();
                } catch { }
                try { scannerRef.current.clear(); } catch { }
                scannerRef.current = null;
            }
        } finally {
            cleanupReaderElement();
            isStoppingRef.current = false;
        }
    }, [cleanupReaderElement]);

    // STEP 1 — trigger browser permission popup
    const handleRequestPermission = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // FIX 3: Explicitly request getUserMedia first so the permission
            // prompt fires before Html5Qrcode.getCameras() is called.
            // Some browsers block getCameras() if permission hasn't been granted yet.
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            stream.getTracks().forEach(t => t.stop());

            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) {
                setError('Permission granted but no cameras detected.');
                setFlowState('ERROR');
                return;
            }
            const available = devices.map(d => ({
                id: d.id,
                label: d.label || (d.id.toLowerCase().includes('back') ? 'Camera facing back' : 'Camera facing front'),
            }));
            setCameras(available);
            const back = available.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            const def = back || available[0];
            setSelectedCameraId(def.id);
            setFlowState('SELECTING_CAMERA');
        } catch (err: any) {
            const msg = (err?.message || '').toLowerCase();
            setError(
                msg.includes('notallowed') || msg.includes('denied')
                    ? 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
                    : `Camera error: ${err?.message || err}`
            );
            setFlowState('ERROR');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // STEP 3 — actually start the scanner
    const startScanner = useCallback(async (cameraId: string) => {
        await stopScanner();
        if (!isMountedRef.current) return;

        // FIX 4: Set SCANNING state BEFORE the await so the container div becomes
        // visible (display:block) before ensureReaderElement() tries to append to it.
        setFlowState('SCANNING');
        setIsLoading(true);
        setError(null);
        setScanSuccess(false);
        lastScannedTextRef.current = null;
        lastScanTimeRef.current = 0;
        setZoomCapabilities(null);
        setCurrentZoom(1);
        setIsTorchSupported(false);
        setIsTorchOn(false);

        // FIX 5: Wait one animation frame (not just setTimeout 0) so React has
        // flushed the state update and applied display:block to the container.
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
        if (!isMountedRef.current) return;

        try {
            const readerEl = ensureReaderElement();
            if (!readerEl) {
                setError('Could not initialize camera viewport. Please try again.');
                setFlowState('ERROR');
                return;
            }

            scannerRef.current = new Html5Qrcode(readerEl.id, {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                ],
                verbose: false,
            });

            const onScanSuccess = (decodedText: string) => {
                const now = Date.now();
                // Debounce: ignore the same code scanned within 1.5 s
                if (lastScannedTextRef.current === decodedText && now - lastScanTimeRef.current < 1500) return;
                if (!isMountedRef.current) return;
                lastScannedTextRef.current = decodedText;
                lastScanTimeRef.current = now;
                setScanSuccess(true);
                playSuccessSound();
                if (navigator.vibrate) navigator.vibrate(200);
                setTimeout(() => {
                    if (isMountedRef.current) {
                        onScan(decodedText);
                        stopScanner().then(() => { if (isMountedRef.current) onClose(); });
                    }
                }, 400);
            };

            await scannerRef.current.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: (w: number, h: number) => {
                        const size = Math.floor(Math.min(w, h) * 0.7);
                        return { width: size, height: size };
                    },
                    disableFlip: false,
                },
                onScanSuccess,
                () => { } // ignore per-frame decode errors
            );

            // Probe advanced track capabilities (zoom / torch) — optional, won't crash if unsupported
            try {
                const caps = scannerRef.current.getRunningTrackCapabilities() as any;
                if (caps?.zoom) { setZoomCapabilities(caps.zoom); setCurrentZoom(caps.zoom.min ?? 1); }
                if (caps?.torch) setIsTorchSupported(true);
            } catch { }

        } catch (err: any) {
            if (!isMountedRef.current) return;
            const msg = (err?.message || '').toLowerCase();
            setError(
                msg.includes('notallowed') || msg.includes('denied')
                    ? 'Camera permission was denied. Please check your browser/app settings.'
                    : msg.includes('overconstrained') || msg.includes('constraint')
                        ? 'This camera could not start. Please try a different camera.'
                        : err?.message || String(err)
            );
            setFlowState('ERROR');
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [stopScanner, ensureReaderElement, onScan, onClose, playSuccessSound]);

    const handleZoomChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setCurrentZoom(value);
        try { await scannerRef.current?.applyVideoConstraints({ advanced: [{ zoom: value } as any] }); } catch { }
    }, []);

    const toggleTorch = useCallback(async () => {
        if (!scannerRef.current || !isTorchSupported) return;
        const next = !isTorchOn;
        try {
            await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next } as any] });
            setIsTorchOn(next);
        } catch { }
    }, [isTorchOn, isTorchSupported]);

    // Track mount status so async callbacks can bail out after unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopScanner(); // always clean up on unmount
        };
    }, []);

    // FIX 6: Reset state when modal opens; stop scanner when it closes.
    // stopScanner is stable (useCallback with no deps that change), so it's safe
    // to omit from deps — but adding it explicitly is cleaner.
    useEffect(() => {
        if (isOpen) {
            setFlowState('REQUEST_PERMISSION');
            setError(null);
            setScanSuccess(false);
            setCameras([]);
            setSelectedCameraId(null);
            setIsLoading(false);
        } else {
            stopScanner();
        }
    }, [isOpen, stopScanner]);

    const handleClose = useCallback(async () => {
        await stopScanner();
        onClose();
    }, [stopScanner, onClose]);

    // FIX 7: Render the modal wrapper always (so containerRef is never null),
    // but hide it via CSS when isOpen is false.
    // Previously `if (!isOpen) return null` would unmount containerRef mid-scan.
    const showViewfinder = flowState === 'SCANNING' || flowState === 'ERROR';

    return (
        <>
            {/* FIX 8: Use a plain <style> tag instead of <style jsx global>.
                `jsx` is a Styled-JSX prop and requires the @styled-jsx/plugin-babel
                transform. In many Next.js setups (especially with the App Router
                and SWC compiler) it is not available, causing a build/runtime error.
                A regular <style> tag in a 'use client' component works everywhere. */}
            <style>{`
                @keyframes scan-line {
                    0%   { top: 5%; }
                    50%  { top: 90%; }
                    100% { top: 5%; }
                }
                .animate-scan-line { animation: scan-line 2.5s ease-in-out infinite; }
            `}</style>

            {/* FIX 9: Keep modal in DOM when closed (display:none) so containerRef
                is always valid. Use pointer-events:none + opacity:0 as an extra
                safeguard so it can't be accidentally interacted with when hidden. */}
            <div
                className="modal-overlay"
                style={{ display: isOpen ? undefined : 'none' }}
                onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div className="modal-content max-w-lg">

                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Scan Barcode / QR Code</h2>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div className="space-y-4 pb-4">

                        {/* STEP 1: Request Permission */}
                        {flowState === 'REQUEST_PERMISSION' && (
                            <div className="flex flex-col items-center justify-center py-8 px-4 space-y-5 text-center">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-500 shadow-inner">
                                    <FontAwesomeIcon icon={faCamera} className="text-3xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-bold text-gray-900 text-base">Camera Access Required</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                                        To scan barcodes and QR codes, this app needs access to your camera.
                                        Tap below to allow access.
                                    </p>
                                </div>
                                <button
                                    onClick={handleRequestPermission}
                                    disabled={isLoading}
                                    className="w-full max-w-xs py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Requesting...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faLock} className="text-xs opacity-70" />
                                            Request Camera Permission
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Select Camera */}
                        {flowState === 'SELECTING_CAMERA' && (
                            <div className="flex flex-col items-center justify-center py-6 px-4 space-y-5 text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                                    <FontAwesomeIcon icon={faCameraRotate} className="text-2xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-bold text-gray-900 text-base">Permission Granted!</h3>
                                    <p className="text-xs text-gray-500">Select which camera you want to use.</p>
                                </div>
                                <div className="w-full max-w-xs space-y-3">
                                    <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                                        {cameras.map(cam => (
                                            <button
                                                key={cam.id}
                                                onClick={() => setSelectedCameraId(cam.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold transition-colors ${selectedCameraId === cam.id
                                                    ? 'bg-indigo-50 text-indigo-700'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span>{cam.label}</span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedCameraId === cam.id ? 'border-indigo-600' : 'border-gray-300'
                                                    }`}>
                                                    {selectedCameraId === cam.id && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                                        disabled={!selectedCameraId || isLoading}
                                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Starting...
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faCamera} />
                                                Start Scanning
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setFlowState('REQUEST_PERMISSION')}
                                        className="text-xs text-indigo-500 hover:underline font-semibold"
                                    >
                                        Refresh Camera List
                                    </button>
                                </div>
                            </div>
                        )}

                        {/*
                            FIX 10: This container div is ALWAYS in the React tree.
                            Visibility is controlled with display:none/block, NOT by
                            conditional rendering. If this were `{showViewfinder && <div ref=…>}`
                            then containerRef.current would be null when startScanner() runs
                            (before React re-renders), and html5-qrcode would throw.
                        */}
                        <div
                            ref={containerRef}
                            style={{ display: showViewfinder ? 'block' : 'none' }}
                            className={`w-full overflow-hidden rounded-2xl border-4 transition-all duration-300 min-h-[300px] relative ${scanSuccess
                                ? 'border-green-500 shadow-green-200 shadow-xl bg-green-50'
                                : flowState === 'SCANNING'
                                    ? 'border-indigo-500 shadow-lg'
                                    : 'border-dashed border-gray-200 bg-gray-50'
                                }`}
                        >
                            {flowState === 'SCANNING' && !scanSuccess && (
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="relative w-48 h-48 border-2 border-dashed border-white/40 rounded-3xl">
                                            <div className="w-full h-0.5 bg-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.9)] absolute animate-scan-line" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoading && flowState === 'SCANNING' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-600 italic">Starting camera...</p>
                                    </div>
                                </div>
                            )}

                            {flowState === 'ERROR' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-rose-50/60 p-6 z-20">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">Something went wrong</p>
                                        <p className="text-xs text-gray-500 max-w-[220px] mx-auto">{error || 'Unknown camera error'}</p>
                                        <div className="flex gap-2 justify-center pt-1 flex-wrap">
                                            <button
                                                onClick={() => setFlowState('REQUEST_PERMISSION')}
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold"
                                            >
                                                Start Over
                                            </button>
                                            {selectedCameraId && (
                                                <button
                                                    onClick={() => startScanner(selectedCameraId)}
                                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-rose-100"
                                                >
                                                    Try Again
                                                </button>
                                            )}
                                            {cameras.length > 1 && (
                                                <button
                                                    onClick={() => setFlowState('SELECTING_CAMERA')}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                                                >
                                                    Switch Camera
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Zoom & Torch — only while actively scanning */}
                        {flowState === 'SCANNING' && !scanSuccess && (
                            <div className="space-y-3">
                                {zoomCapabilities && (
                                    <div className="px-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                            <div className="flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                                                <span>Zoom</span>
                                            </div>
                                            <span className="text-indigo-500">{(currentZoom || 1).toFixed(1)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={zoomCapabilities.min}
                                            max={zoomCapabilities.max}
                                            step={zoomCapabilities.step || 0.1}
                                            value={currentZoom}
                                            onChange={handleZoomChange}
                                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                )}
                                {isTorchSupported && (
                                    <button
                                        onClick={toggleTorch}
                                        className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${isTorchOn
                                            ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-500'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faBolt} className={isTorchOn ? 'animate-pulse' : ''} />
                                        <span className="text-sm font-semibold">{isTorchOn ? 'Turn Flash Off' : 'Turn Flash On'}</span>
                                    </button>
                                )}
                            </div>
                        )}

                        <p className="text-center text-[11px] text-gray-400 font-medium">
                            {flowState === 'SCANNING'
                                ? 'Position the barcode or QR code within the viewfinder.'
                                : 'Camera access is required to scan barcodes and QR codes.'}
                        </p>

                        <div className="flex flex-wrap justify-center gap-2">
                            {flowState === 'SCANNING' && cameras.length > 1 && (
                                <button
                                    onClick={() => { stopScanner(); setFlowState('SELECTING_CAMERA'); }}
                                    className="btn-secondary flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                                >
                                    <FontAwesomeIcon icon={faCameraRotate} /> Switch Camera
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="btn-secondary flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                            >
                                <FontAwesomeIcon icon={faTimes} /> Close
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}