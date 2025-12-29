"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Smartphone, Check, X } from "lucide-react";

interface ImmersionButtonProps {
    /** Function to request permission */
    requestPermission: () => Promise<boolean>;
    /** Whether permission has already been granted */
    hasPermission: boolean;
    /** Class name overrides */
    className?: string;
}

/**
 * "Enable Immersion" button for iOS devices.
 * iOS 13+ requires explicit user interaction to access gyroscope data.
 * This button requests permission with a sci-fi aesthetic.
 */
export function ImmersionButton({
    requestPermission,
    hasPermission,
    className = "",
}: ImmersionButtonProps) {
    const [isRequesting, setIsRequesting] = useState(false);
    const [wasGranted, setWasGranted] = useState(hasPermission);
    const [wasDenied, setWasDenied] = useState(false);

    const handleClick = async () => {
        if (wasGranted || wasDenied || isRequesting) return;

        setIsRequesting(true);
        try {
            const granted = await requestPermission();
            if (granted) {
                setWasGranted(true);
            } else {
                setWasDenied(true);
            }
        } catch {
            setWasDenied(true);
        } finally {
            setIsRequesting(false);
        }
    };

    // Don't render if already granted
    if (hasPermission && !isRequesting && !wasGranted) {
        return null;
    }

    return (
        <AnimatePresence>
            {!wasGranted && (
                <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClick}
                    disabled={isRequesting || wasDenied}
                    className={`
                        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                        px-6 py-3 rounded-full
                        bg-gradient-to-r from-emerald-500/90 to-cyan-500/90
                        backdrop-blur-md
                        border border-white/20
                        shadow-[0_0_30px_rgba(16,185,129,0.4)]
                        text-white text-sm font-medium tracking-wide
                        flex items-center gap-3
                        transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${className}
                    `}
                >
                    {isRequesting ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                <Compass className="w-5 h-5" />
                            </motion.div>
                            <span>Calibrating Sensors...</span>
                        </>
                    ) : wasDenied ? (
                        <>
                            <X className="w-5 h-5 text-red-300" />
                            <span>Sensors Unavailable</span>
                        </>
                    ) : (
                        <>
                            <Smartphone className="w-5 h-5" />
                            <span>Enable Immersion</span>
                            <motion.div
                                animate={{ x: [0, 3, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <span className="text-xs opacity-70">↔</span>
                            </motion.div>
                        </>
                    )}
                </motion.button>
            )}

            {/* Success flash */}
            {wasGranted && (
                <motion.div
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={{ opacity: [0, 1, 0], scale: [1.5, 1, 0.8] }}
                    transition={{ duration: 1.5 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                    <div className="px-6 py-3 rounded-full bg-emerald-500/90 text-white flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span>Immersion Active</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
