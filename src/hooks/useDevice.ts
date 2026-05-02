'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApi } from './useApi';

export interface DeviceProfile {
    id: string;
    deviceIdentifier: string;
    name: string;
    defaultPrinter: 'thermal' | 'a4';
    defaultScanner: 'keyboard' | 'camera';
    isActive: boolean;
}

export function useDevice() {
    const { apiFetch } = useApi();
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [profile, setProfile] = useState<DeviceProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Run only on browser
        if (typeof window !== 'undefined') {
            let storedId = localStorage.getItem('pos_device_id');
            if (!storedId) {
                storedId = uuidv4();
                localStorage.setItem('pos_device_id', storedId);
            }
            setDeviceId(storedId);
        }
    }, []);

    useEffect(() => {
        if (deviceId) {
            fetchProfile(deviceId);
        }
    }, [deviceId]);

    const fetchProfile = async (id: string) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/settings/device?deviceId=${id}`);
            if (res.success) {
                setProfile(res.data);
            }
        } catch (e) {
            console.error('Error fetching device profile', e);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (data: Partial<DeviceProfile>) => {
        if (!deviceId) return { success: false, message: 'No device ID locally' };

        try {
            const res = await apiFetch('/api/settings/device', {
                method: 'POST',
                body: JSON.stringify({ deviceId, ...data })
            });
            if (res.success) {
                setProfile(res.data);
            }
            return res;
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    return {
        deviceId,
        profile,
        loading,
        updateProfile,
        refreshProfile: () => deviceId && fetchProfile(deviceId)
    };
}
