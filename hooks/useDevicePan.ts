"use client";

import { useEffect, useState } from "react";
import { useSpring, useTransform, MotionValue } from "framer-motion";
import { useGyroscope } from "./useGyroscope";

interface DevicePanState {
    /** The x-axis translation value (percentage) - use with framer-motion */
    xPercent: MotionValue<number>;
    /** The y-axis translation value (percentage) - use with framer-motion */
    yPercent: MotionValue<number>;
    /** Whether the device is mobile and has gyroscope */
    isMobile: boolean;
    /** Whether the gyroscope is active */
    isGyroscopeActive: boolean;
    /** Whether permission is required (iOS) */
    requiresPermission: boolean;
    /** Whether permission has been granted */
    hasPermission: boolean;
    /** Request permission (for iOS "Enable Immersion" button) */
    requestPermission: () => Promise<boolean>;
}

interface DevicePanOptions {
    /** Maximum tilt angle to respond to (default: 30 degrees) */
    maxTilt?: number;
    /** Maximum pan percentage (default: 15) */
    maxPan?: number;
    /** Spring stiffness (default: 50 for "heavy" feel) */
    stiffness?: number;
    /** Spring damping (default: 20 for smooth movement) */
    damping?: number;
    /** Enable Y-axis panning (default: false - only X for "look around") */
    enableYAxis?: boolean;
}

/**
 * Hook that combines gyroscope data (mobile) with mouse parallax (desktop)
 * to create a smooth "look around" pan effect for background images.
 * 
 * Usage:
 * ```tsx
 * const { xPercent, yPercent, isMobile, requiresPermission, requestPermission } = useDevicePan();
 * 
 * return (
 *   <motion.div style={{ x: xPercent, y: yPercent }}>
 *     <Image ... />
 *   </motion.div>
 * );
 * ```
 */
export function useDevicePan(options: DevicePanOptions = {}): DevicePanState {
    const {
        maxTilt = 30,
        maxPan = 15,
        stiffness = 50,
        damping = 20,
        enableYAxis = false,
    } = options;

    const gyroscope = useGyroscope();
    const [isMobile, setIsMobile] = useState(false);
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);

    // Detect mobile device
    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkMobile = () => {
            const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            const isNarrow = window.innerWidth < 768;
            setIsMobile(isTouchDevice && isNarrow);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Mouse tracking for desktop parallax
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (isMobile) return; // Don't track mouse on mobile

        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position to -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMouseX(x);
            setMouseY(y);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isMobile]);

    // Spring configuration for smooth, "heavy" physics feel
    const springConfig = { stiffness, damping };

    // Create spring values
    const rawX = useSpring(0, springConfig);
    const rawY = useSpring(0, springConfig);

    // Update raw values based on input source
    useEffect(() => {
        if (isMobile && gyroscope.hasPermission) {
            // MOBILE: Map gamma (tilt angle) to pan percentage
            // gamma ranges from -maxTilt to +maxTilt, map to -maxPan to +maxPan
            const clampedGamma = Math.max(-maxTilt, Math.min(maxTilt, gyroscope.gamma));
            const normalizedX = clampedGamma / maxTilt; // -1 to 1
            rawX.set(normalizedX * maxPan);

            if (enableYAxis) {
                // beta is front-to-back tilt, use for Y panning if enabled
                const clampedBeta = Math.max(-maxTilt, Math.min(maxTilt, gyroscope.beta - 45)); // Offset for natural holding angle
                const normalizedY = clampedBeta / maxTilt;
                rawY.set(normalizedY * maxPan);
            }
        } else if (!isMobile) {
            // DESKTOP: Map mouse position to subtle parallax
            // Mouse parallax is more subtle (half the movement of gyroscope)
            rawX.set(mouseX * (maxPan * 0.5));

            if (enableYAxis) {
                rawY.set(mouseY * (maxPan * 0.5));
            }
        }
    }, [
        isMobile,
        gyroscope.gamma,
        gyroscope.beta,
        gyroscope.hasPermission,
        mouseX,
        mouseY,
        maxTilt,
        maxPan,
        enableYAxis,
        rawX,
        rawY,
    ]);

    // Transform to percentage values with "%" suffix for CSS
    const xPercent = useTransform(rawX, (v) => `${-v}%`);
    const yPercent = useTransform(rawY, (v) => `${-v}%`);

    return {
        xPercent: xPercent as unknown as MotionValue<number>,
        yPercent: yPercent as unknown as MotionValue<number>,
        isMobile,
        isGyroscopeActive: isMobile && gyroscope.hasPermission,
        requiresPermission: gyroscope.requiresPermission,
        hasPermission: gyroscope.hasPermission,
        requestPermission: gyroscope.requestPermission,
    };
}
