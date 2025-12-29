"use client";

import { motion, useAnimation } from "framer-motion";
import { ReactNode, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useDevicePan } from "@/hooks/useDevicePan";
import { ImmersionButton } from "@/components/ui/ImmersionButton";

interface SceneStageProps {
    mediaUrl?: string;
    children?: ReactNode;
    isFocused?: boolean;
    playbackSpeed?: number;
    shouldLoop?: boolean; // false = cinematic transition (play once, hold on final frame)
    glimpseUrl?: string; // The Ghost in the Glass
    /** Enable gyroscope pan effect (default: true) */
    enablePan?: boolean;
}

export default function SceneStage({
    mediaUrl,
    children,
    isFocused = false,
    playbackSpeed = 1.0,
    shouldLoop = true,
    glimpseUrl,
    enablePan = true,
}: SceneStageProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const glimpseControls = useAnimation();

    // Device pan effect (gyroscope on mobile, mouse parallax on desktop)
    const {
        xPercent,
        isMobile,
        requiresPermission,
        hasPermission,
        requestPermission,
    } = useDevicePan({
        maxTilt: 30,
        maxPan: 15,
        stiffness: 50,
        damping: 20,
    });

    // Track if this is an image (to apply pan effect)
    const isImage = mediaUrl && !mediaUrl.match(/\.(mp4|webm|mov)$/i);

    // Should we show the immersion button? (iOS mobile without permission)
    const showImmersionButton = enablePan && isMobile && requiresPermission && !hasPermission;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, mediaUrl]);

    // Randomize Glimpse Appearance
    useEffect(() => {
        if (!glimpseUrl) return;

        let isMounted = true;

        const runGlimpseCycle = async () => {
            // Initial random delay between 45s and 90s
            const delay = Math.random() * (90000 - 45000) + 45000;
            await new Promise(r => setTimeout(r, delay));

            if (!isMounted) return;

            // Fade In
            await glimpseControls.start({ opacity: 0.08, transition: { duration: 3, ease: "easeInOut" } });

            // Hold
            await new Promise(r => setTimeout(r, 2000));

            if (!isMounted) return;

            // Fade Out
            await glimpseControls.start({ opacity: 0, transition: { duration: 3, ease: "easeInOut" } });

            // Recurse
            runGlimpseCycle();
        };

        runGlimpseCycle();

        return () => { isMounted = false; };
    }, [glimpseUrl, glimpseControls]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-stone-900 border-b border-driftwood/20">
            {/* iOS Immersion Permission Button */}
            {showImmersionButton && (
                <ImmersionButton
                    requestPermission={requestPermission}
                    hasPermission={hasPermission}
                />
            )}

            {/* Background with gyroscope/parallax pan effect */}
            <motion.div
                className="absolute inset-0 w-full h-full -z-0"
                animate={{
                    filter: isFocused ? "blur(40px) brightness(0.5)" : "blur(0px) brightness(1)",
                }}
                transition={{ duration: 1, ease: "easeInOut" }}
            >
                {/* Media Container - wider on mobile to allow panning */}
                <motion.div
                    className={`absolute inset-0 ${enablePan && isMobile
                            ? "w-[150vw] left-[-25vw]"
                            : "w-full"
                        } h-full`}
                    style={enablePan ? { x: xPercent } : undefined}
                >
                    {!mediaUrl ? (
                        <div className="w-full h-full bg-slate-900 animate-pulse" />
                    ) : mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                        // VIDEO: Apply pan effect to video container
                        <video
                            key={mediaUrl}
                            ref={videoRef}
                            src={mediaUrl}
                            autoPlay
                            muted
                            loop={shouldLoop}
                            playsInline
                            preload="auto"
                            className="w-full h-full object-cover opacity-90"
                        />
                    ) : (
                        // IMAGE: Apply pan + subtle drift animation
                        <motion.div
                            key={mediaUrl}
                            initial={{ scale: 1.1 }}
                            animate={{
                                // Subtle drift animation (reduced when pan is active on mobile)
                                x: (enablePan && isMobile && hasPermission) ? 0 : [0, -15, 10, -5, 0],
                                y: [0, 10, -10, 5, 0],
                                rotate: [0, -0.5, 0.5, -0.25, 0]
                            }}
                            transition={{
                                duration: 25,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatType: "mirror",
                                times: [0, 0.3, 0.6, 0.8, 1]
                            }}
                            className="w-full h-full relative"
                        >
                            <Image
                                src={mediaUrl}
                                alt="Scene Background"
                                fill
                                className="object-cover opacity-90"
                                priority
                                sizes={enablePan && isMobile ? "150vw" : "100vw"}
                            />
                        </motion.div>
                    )}

                    {/* THE GLIMPSE MECHANIC (Ghost in the Glass) */}
                    {glimpseUrl && (
                        <motion.div
                            key="glimpse-layer"
                            className="absolute inset-0 z-10 pointer-events-none mix-blend-screen"
                            initial={{ opacity: 0 }}
                            animate={glimpseControls}
                        >
                            {glimpseUrl.match(/\.(mp4|webm|mov)$/i) ? (
                                <video
                                    src={glimpseUrl}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Image
                                    src={glimpseUrl}
                                    alt="Reflected Presence"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </motion.div>
                    )}

                    {/* Overlay to ensure text legibility */}
                    <div className="absolute inset-0 bg-black/10" />
                </motion.div>
            </motion.div>

            {/* Interactive Layer */}
            <div className="relative z-10 w-full h-full pointer-events-none">
                {/* Children (Objects) must have pointer-events-auto */}
                {children}
            </div>
        </div>
    );
}
