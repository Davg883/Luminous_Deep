"use client";

import React, { useEffect, useRef, ReactNode, CSSProperties } from "react";
import { useAudioSovereignSafe } from "@/components/narrative/AudioSovereign";

/**
 * useSanctuaryPulse
 * 
 * A hook that provides a ref to attach to any HTML element.
 * The element will pulse with a breathing animation when audio is playing,
 * creating a "breathing sanctuary" effect.
 * 
 * Usage:
 * ```tsx
 * const pulseRef = useSanctuaryPulse<HTMLDivElement>();
 * 
 * return (
 *   <div 
 *     ref={pulseRef} 
 *     className="sanctuary-breathing sanctuary-breathing-cyan"
 *   >
 *     This card breathes when audio plays
 *   </div>
 * );
 * ```
 */
export function useSanctuaryPulse<T extends HTMLElement>() {
    const elementRef = useRef<T>(null);
    const audio = useAudioSovereignSafe();

    useEffect(() => {
        const element = elementRef.current;
        if (!element || !audio) return;

        // Use CSS animation when playing, controlled via custom property
        const updatePulse = () => {
            const intensity = audio.isPlaying && !audio.isMuted ? "1" : "0";
            element.style.setProperty("--pulse-intensity", intensity);
        };

        updatePulse();

        // No need for animation frame since we're using CSS animations
        // Just update when state changes
    }, [audio?.isPlaying, audio?.isMuted]);

    return elementRef;
}

/**
 * useSanctuaryGlow
 * 
 * Returns the audio state for custom visual effects.
 * 
 * Usage:
 * ```tsx
 * const { isPlaying, isMuted } = useSanctuaryGlow();
 * 
 * return (
 *   <div style={{ 
 *     boxShadow: isPlaying && !isMuted 
 *       ? '0 0 30px rgba(14, 165, 233, 0.5)' 
 *       : 'none' 
 *   }}>
 *     Custom glow effect
 *   </div>
 * );
 * ```
 */
export function useSanctuaryGlow() {
    const audio = useAudioSovereignSafe();

    return {
        isPlaying: audio?.isPlaying ?? false,
        isMuted: audio?.isMuted ?? true,
        hasInteracted: audio?.hasInteracted ?? false,
        currentRoom: audio?.currentRoom ?? "default",
        volume: audio?.volume ?? 0,
    };
}

/**
 * SanctuaryBreathingWrapper
 * 
 * A wrapper component that adds the breathing sanctuary effect to its children.
 * 
 * Usage:
 * ```tsx
 * return (
 *   <SanctuaryBreathingWrapper 
 *     glowColor="cyan" 
 *     className="your-card-classes"
 *   >
 *     <CardContent />
 *   </SanctuaryBreathingWrapper>
 * );
 * ```
 */
interface SanctuaryBreathingWrapperProps {
    children: ReactNode;
    glowColor?: "cyan" | "amber" | "emerald";
    className?: string;
    style?: CSSProperties;
}

export function SanctuaryBreathingWrapper({
    children,
    glowColor = "cyan",
    className = "",
    style = {},
}: SanctuaryBreathingWrapperProps) {
    const pulseRef = useSanctuaryPulse<HTMLDivElement>();
    const glowClasses = {
        cyan: "sanctuary-breathing-cyan",
        amber: "sanctuary-breathing-amber",
        emerald: "sanctuary-breathing-emerald",
    };

    return (
        <div
            ref={pulseRef}
            className={`sanctuary-breathing ${glowClasses[glowColor]} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
