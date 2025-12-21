"use client";

import { motion } from "framer-motion";
import { ReactNode, useRef, useEffect } from "react";
import Image from "next/image";

interface SceneStageProps {
    mediaUrl?: string; // Optional for now, fallback to placeholder
    children?: ReactNode;
    isFocused?: boolean;
    playbackSpeed?: number;
}

export default function SceneStage({ mediaUrl, children, isFocused = false, playbackSpeed = 1.0 }: SceneStageProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, mediaUrl]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-stone-900 border-b border-driftwood/20">
            {/* Background with slight parallax/pan effect */}
            {/* Background Container */}
            <motion.div
                className="absolute inset-0 w-full h-full -z-0"
                animate={{
                    filter: isFocused ? "blur(40px) brightness(0.5)" : "blur(0px) brightness(1)",
                }}
                transition={{ duration: 1, ease: "easeInOut" }}
            >
                {/* Media Handling */}
                <div className="absolute inset-0">
                    {!mediaUrl ? (
                        <div className="w-full h-full bg-slate-900 animate-pulse" />
                    ) : mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                            ref={videoRef}
                            src={mediaUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover opacity-90"
                        />
                    ) : (
                        <motion.div
                            initial={{ scale: 1.1, x: 0, y: 0 }}
                            animate={{
                                x: [0, -15, 10, -5, 0],
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
                            />
                        </motion.div>
                    )}
                    {/* Overlay to ensure text legibility depending on domain later */}
                    <div className="absolute inset-0 bg-black/10" />
                </div>
            </motion.div>

            {/* Interactive Layer */}
            <div className="relative z-10 w-full h-full pointer-events-none">
                {/* Children (Objects) must have pointer-events-auto */}
                {children}
            </div>
        </div>
    );
}
