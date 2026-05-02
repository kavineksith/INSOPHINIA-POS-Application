'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerProps {
    onScan: (barcode: string) => void;
    enabled?: boolean;
    minChars?: number;
    maxInterval?: number; // ms between keypresses
    suffixKeys?: string[]; // Keys that trigger scan submission
    enableSound?: boolean; // Play beep on successful scan
}

/**
 * Hook to capture input from USB/Bluetooth/Wireless barcode scanners.
 * 
 * These scanners act as keyboard input devices — they type characters rapidly
 * and end with an Enter key. This hook detects that rapid-fire input pattern
 * and distinguishes it from manual typing.
 * 
 * Supports:
 * - USB wired barcode scanners
 * - Bluetooth wireless barcode scanners
 * - 2.4GHz wireless barcode scanners
 * - Any HID (Human Interface Device) scanner
 * - Mobile device Bluetooth paired scanners
 * 
 * Works globally — even when focus is in an input field — because POS scanners
 * should always work regardless of where the cursor is.
 */
export function useBarcodeScanner({
    onScan,
    enabled = true,
    minChars = 3,
    maxInterval = 150, // 150ms to support slower Bluetooth/wireless scanners
    suffixKeys = ['Enter', 'Tab'],
    enableSound = true,
}: UseBarcodeScannerProps) {
    const buffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onScanRef = useRef(onScan);

    // Keep onScan ref up to date without causing re-renders
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const playBeep = useCallback(() => {
        if (!enableSound) return;
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
    }, [enableSound]);

    const resetBuffer = useCallback(() => {
        buffer.current = '';
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const processScan = useCallback((scannedCode: string, e?: KeyboardEvent) => {
        resetBuffer();
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        playBeep();
        if (navigator.vibrate) navigator.vibrate(100);
        onScanRef.current(scannedCode);
    }, [resetBuffer, playBeep]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const diff = now - lastKeyTime.current;
            lastKeyTime.current = now;

            // Clear any existing auto-reset timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Check for suffix keys (Enter, Tab, etc.)
            if (suffixKeys.includes(e.key)) {
                if (buffer.current.length >= minChars) {
                    processScan(buffer.current, e);
                } else {
                    resetBuffer();
                }
                return;
            }

            // If too much time has passed, this is likely manual typing — reset
            if (diff > maxInterval && buffer.current.length > 0) {
                resetBuffer();
            }

            // Only append printable characters
            if (e.key.length === 1) {
                buffer.current += e.key;

                // Auto-reset buffer after a pause (safety net for scanners 
                // that don't send Enter/Tab suffix)
                timeoutRef.current = setTimeout(() => {
                    if (buffer.current.length >= minChars) {
                        processScan(buffer.current);
                    } else {
                        resetBuffer();
                    }
                }, 300);
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, minChars, maxInterval, suffixKeys, resetBuffer, processScan]);

    return null;
}
