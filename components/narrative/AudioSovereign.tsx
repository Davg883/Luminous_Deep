"use client";

import React, {
    createContext,
    useContext,
    useCallback,
    useRef,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import clsx from "clsx";

// ═══════════════════════════════════════════════════════════════
// ROOM SOUNDSCAPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
interface RoomSoundConfig {
    url: string;
    description: string;
}

const ROOM_SOUNDSCAPES: Record<string, RoomSoundConfig> = {
    sanctuary: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766917918/The_sanctory_dn1hxh.wav",
        description: "The Sanctuary ambient soundscape",
    },
    workshop: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/mechanical_zen_40hz_qw2x9p.mp3",
        description: "Sub-bass pulses, rhythmic wood planing, metallic resonance",
    },
    study: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/archival_memory_40hz_mk7n3r.mp3",
        description: "Lo-fi tape hiss, distant lighthouse horn, rhythmic heartbeat",
    },
    "luminous-deep": {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/system_telemetry_40hz_v9p2lf.mp3",
        description: "Pure electronic hum, 1Gbps data flow white noise, server cooling",
    },
    default: {
        url: "https://assets.mixkit.co/sfx/preview/mixkit-distant-ocean-waves-1128.mp3",
        description: "Distant ocean ambience",
    },
};

// ═══════════════════════════════════════════════════════════════
// AUDIO CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════
interface AudioSovereignContextType {
    isMuted: boolean;
    volume: number;
    hasInteracted: boolean;
    isPlaying: boolean;
    currentRoom: string;
    setMuted: (muted: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    activateSanctuary: () => void;
}

const AudioSovereignContext = createContext<AudioSovereignContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// AUDIO SOVEREIGN PROVIDER - Simplified for reliability
// ═══════════════════════════════════════════════════════════════
interface AudioSovereignProviderProps {
    children: ReactNode;
}

export function AudioSovereignProvider({ children }: AudioSovereignProviderProps) {
    // State
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolumeState] = useState(0.4);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentRoom, setCurrentRoom] = useState("default");

    // Single audio element ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentSourceRef = useRef<string | undefined>(undefined);

    // Navigation
    const pathname = usePathname();

    // Detect room from URL
    // Sanctuary paths: /sanctuary/library, /sanctuary/library/reader/*, etc.
    const isSanctuaryPath = pathname?.startsWith("/sanctuary");
    const routeSlug = pathname === "/"
        ? "home"
        : isSanctuaryPath
            ? "sanctuary"
            : (pathname?.split("/").slice(-1)[0] || "home");

    // Fetch scene data (skip for sanctuary since it uses the route-based soundscape)
    const scene = useQuery(api.public.scenes.getScene, isSanctuaryPath ? "skip" : { slug: routeSlug });

    // Determine target audio URL
    const effectiveDomain = scene?.domain || routeSlug;
    let targetUrl: string;
    if (scene?.ambientAudioUrl) {
        targetUrl = scene.ambientAudioUrl;
    } else if (ROOM_SOUNDSCAPES[effectiveDomain]) {
        targetUrl = ROOM_SOUNDSCAPES[effectiveDomain].url;
    } else {
        targetUrl = ROOM_SOUNDSCAPES.default.url;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTROLS
    // ═══════════════════════════════════════════════════════════════
    const setVolume = useCallback((newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, newVolume));
        setVolumeState(clampedVolume);

        // Update audio element volume directly
        if (audioRef.current) {
            audioRef.current.volume = clampedVolume;
        }

        // If adjusting volume to non-zero while muted, unmute
        if (isMuted && clampedVolume > 0) {
            setIsMuted(false);
            if (audioRef.current && hasInteracted) {
                audioRef.current.play().catch(() => { });
                setIsPlaying(true);
            }
        }
    }, [isMuted, hasInteracted]);

    const setMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
        if (!hasInteracted) setHasInteracted(true);
    }, [hasInteracted]);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (!hasInteracted) setHasInteracted(true);

        if (audioRef.current) {
            if (newMuted) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().catch(() => { });
                setIsPlaying(true);
            }
        }
    }, [isMuted, hasInteracted]);

    const activateSanctuary = useCallback(() => {
        setIsMuted(false);
        setHasInteracted(true);
        setIsPlaying(true);

        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.play().catch(() => { });
        }
    }, [volume]);

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════

    // Initialize audio element on mount
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
            audioRef.current.volume = volume;
            audioRef.current.preload = "auto";
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    // Handle source changes
    useEffect(() => {
        if (!hasInteracted || !audioRef.current) return;

        if (currentSourceRef.current !== targetUrl) {
            const audio = audioRef.current;

            // Fade out, change source, fade in
            const originalVolume = volume;

            // Simple crossfade
            audio.volume = 0;
            audio.src = targetUrl;
            audio.load();

            audio.oncanplaythrough = () => {
                if (!isMuted) {
                    audio.play().catch(() => { });
                    setIsPlaying(true);
                    // Fade in
                    let fadeVolume = 0;
                    const fadeIn = setInterval(() => {
                        fadeVolume += 0.05;
                        if (fadeVolume >= originalVolume) {
                            audio.volume = originalVolume;
                            clearInterval(fadeIn);
                        } else {
                            audio.volume = fadeVolume;
                        }
                    }, 50);
                }
            };

            currentSourceRef.current = targetUrl;
            setCurrentRoom(effectiveDomain);
        }
    }, [targetUrl, hasInteracted, isMuted, volume, effectiveDomain]);

    // Handle mute state changes
    useEffect(() => {
        if (!audioRef.current || !hasInteracted) return;

        if (isMuted) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = volume;
            audioRef.current.play().catch(() => { });
            setIsPlaying(true);
        }
    }, [isMuted, hasInteracted, volume]);

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current && !isMuted) {
            audioRef.current.volume = volume;
        }
    }, [volume, isMuted]);

    return (
        <AudioSovereignContext.Provider
            value={{
                isMuted,
                volume,
                hasInteracted,
                isPlaying,
                currentRoom,
                setMuted,
                setVolume,
                toggleMute,
                activateSanctuary,
            }}
        >
            {children}
        </AudioSovereignContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════
export function useAudioSovereign(): AudioSovereignContextType {
    const context = useContext(AudioSovereignContext);
    if (context === undefined) {
        throw new Error("useAudioSovereign must be used within an AudioSovereignProvider");
    }
    return context;
}

export function useAudioSovereignSafe(): AudioSovereignContextType | null {
    return useContext(AudioSovereignContext) ?? null;
}

// ═══════════════════════════════════════════════════════════════
// AUDIO CONTROL UI - Glassmorphic Sound Wave Icon
// ═══════════════════════════════════════════════════════════════
export function AudioSovereignControl() {
    const audio = useAudioSovereignSafe();
    const [showVolume, setShowVolume] = useState(false);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    if (!audio) return null;

    const { isMuted, volume, hasInteracted, isPlaying, toggleMute, setVolume, activateSanctuary } = audio;

    const handleMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        setShowVolume(true);
    };

    const handleMouseLeave = () => {
        hideTimeoutRef.current = setTimeout(() => setShowVolume(false), 1500);
    };

    const handleClick = () => {
        if (!hasInteracted) {
            activateSanctuary();
        } else {
            toggleMute();
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setVolume(parseFloat(e.target.value));
    };

    const glowIntensity = 0.6; // Fixed glow intensity (was previously based on audio amplitude)

    return (
        <div
            className="fixed top-6 right-6 z-50 flex items-center gap-3"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Volume Slider (revealed on hover) */}
            <div
                className={clsx(
                    "transition-all duration-300 origin-right overflow-hidden",
                    showVolume
                        ? "w-32 opacity-100 pointer-events-auto"
                        : "w-0 opacity-0 pointer-events-none"
                )}
            >
                <div className="glass-morphic rounded-full px-4 py-2 backdrop-blur-xl bg-black/40">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    />
                </div>
            </div>

            {/* Sound Wave Button */}
            <button
                onClick={handleClick}
                className={clsx(
                    "relative p-3 rounded-full glass-morphic backdrop-blur-xl transition-all duration-300 group",
                    "bg-black/40 border border-white/20 hover:border-white/40",
                    !hasInteracted && "animate-pulse"
                )}
                style={{
                    boxShadow: isPlaying && !isMuted
                        ? `0 0 ${20 * glowIntensity}px rgba(14, 165, 233, ${glowIntensity * 0.5}), 0 0 ${40 * glowIntensity}px rgba(14, 165, 233, ${glowIntensity * 0.3})`
                        : undefined
                }}
                aria-label={!hasInteracted ? "Activate Sanctuary Audio" : isMuted ? "Unmute" : "Mute"}
            >
                {/* Ripple Effect */}
                {isPlaying && !isMuted && (
                    <>
                        <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                        <span className="absolute inset-[-4px] rounded-full border border-cyan-500/30 animate-pulse" />
                    </>
                )}

                {/* Sound Wave Icon */}
                <SoundWaveIcon
                    isPlaying={isPlaying && !isMuted}
                    hasInteracted={hasInteracted}
                />
            </button>

            {/* First-time activation prompt */}
            {!hasInteracted && (
                <div className="absolute top-full right-0 mt-2 whitespace-nowrap">
                    <span className="text-xs text-white/60 font-mono tracking-wide">
                        TAP TO ACTIVATE SANCTUARY
                    </span>
                </div>
            )}
        </div>
    );
}

// Custom Sound Wave Icon with CSS animation
function SoundWaveIcon({ isPlaying, hasInteracted }: { isPlaying: boolean; hasInteracted: boolean }) {
    // Bar heights at rest and animation config
    const bars = [
        { restHeight: 4, animHeight: 14, delay: 0 },
        { restHeight: 6, animHeight: 18, delay: 100 },
        { restHeight: 8, animHeight: 20, delay: 50 },
        { restHeight: 6, animHeight: 18, delay: 150 },
        { restHeight: 4, animHeight: 14, delay: 75 },
    ];

    return (
        <div className="flex items-center justify-center w-5 h-5 gap-[2px]">
            {bars.map((bar, i) => (
                <div
                    key={i}
                    className={clsx(
                        "w-[2px] rounded-full transition-all duration-300",
                        isPlaying
                            ? "bg-cyan-400 animate-pulse"
                            : hasInteracted
                                ? "bg-white/40"
                                : "bg-white/60"
                    )}
                    style={{
                        height: `${isPlaying ? bar.animHeight : bar.restHeight}px`,
                        animationDelay: `${bar.delay}ms`,
                        transformOrigin: 'center',
                    }}
                />
            ))}
        </div>
    );
}
