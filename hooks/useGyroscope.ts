"use client";

import { useState, useEffect, useCallback } from "react";

interface GyroscopeState {
    /** Device tilt left-to-right in degrees (-90 to 90) */
    gamma: number;
    /** Device tilt front-to-back in degrees (-180 to 180) */
    beta: number;
    /** Compass direction (0 to 360) */
    alpha: number;
    /** Whether the gyroscope is available and active */
    isSupported: boolean;
    /** Whether permission has been granted (relevant for iOS) */
    hasPermission: boolean;
    /** Whether permission is required (iOS 13+) */
    requiresPermission: boolean;
    /** Request permission from the user (iOS only) */
    requestPermission: () => Promise<boolean>;
}

/**
 * Hook to access device orientation (gyroscope) data.
 * Handles iOS permission requirements and provides smooth sensor data.
 */
export function useGyroscope(): GyroscopeState {
    const [gamma, setGamma] = useState(0);
    const [beta, setBeta] = useState(0);
    const [alpha, setAlpha] = useState(0);
    const [isSupported, setIsSupported] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [requiresPermission, setRequiresPermission] = useState(false);

    // Check if device orientation is supported and if permission is required
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check basic support
        const supported = "DeviceOrientationEvent" in window;
        setIsSupported(supported);

        if (!supported) return;

        // Check if this is iOS 13+ which requires permission
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const needsPermission = isIOS && typeof (DeviceOrientationEvent as any).requestPermission === "function";
        setRequiresPermission(needsPermission);

        // On non-iOS devices, permission is implicitly granted
        if (!needsPermission) {
            setHasPermission(true);
        }
    }, []);

    // Request permission (iOS 13+)
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (typeof window === "undefined") return false;

        try {
            if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                const granted = permission === "granted";
                setHasPermission(granted);
                return granted;
            }
            // Permission not required
            setHasPermission(true);
            return true;
        } catch (error) {
            console.error("Failed to request device orientation permission:", error);
            return false;
        }
    }, []);

    // Listen for device orientation events
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!isSupported || !hasPermission) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            // gamma: left-to-right tilt (-90 to 90)
            // beta: front-to-back tilt (-180 to 180)
            // alpha: compass direction (0 to 360)
            if (event.gamma !== null) setGamma(event.gamma);
            if (event.beta !== null) setBeta(event.beta);
            if (event.alpha !== null) setAlpha(event.alpha);
        };

        window.addEventListener("deviceorientation", handleOrientation, true);

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation, true);
        };
    }, [isSupported, hasPermission]);

    return {
        gamma,
        beta,
        alpha,
        isSupported,
        hasPermission,
        requiresPermission,
        requestPermission,
    };
}
