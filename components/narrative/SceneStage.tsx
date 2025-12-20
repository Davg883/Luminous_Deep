"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import Image from "next/image";

interface SceneStageProps {
    mediaUrl?: string; // Optional for now, fallback to placeholder
    children?: ReactNode;
}

export default function SceneStage({ mediaUrl, children }: SceneStageProps) {
    // Fallback placeholder if no mediaUrl provided
    const bgSrc = mediaUrl || "https://images.unsplash.com/photo-1598367772323-3be63e1136dc?q=80&w=2670&auto=format&fit=crop";

    return (
        <div className="relative w-full h-screen overflow-hidden bg-stone-900 border-b border-driftwood/20">
            {/* Background with slight parallax/pan effect */}
            {/* Background Container */}
            <div className="absolute inset-0 w-full h-full -z-0">
                {/* Media Handling */}
                <div className="absolute inset-0">
                    {bgSrc.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                            src={bgSrc}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover opacity-90"
                        />
                    ) : (
                        <motion.div
                            initial={{ scale: 1 }}
                            animate={{ scale: 1.05 }}
                            transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                            className="w-full h-full"
                        >
                            <Image
                                src={bgSrc}
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
            </div>

            {/* Interactive Layer */}
            <div className="relative z-10 w-full h-full pointer-events-none">
                {/* Children (Objects) must have pointer-events-auto */}
                {children}
            </div>
        </div>
    );
}
