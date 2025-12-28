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
    // The Solarium (sanctuary) - Rain on glass, high-altitude wind, soft sine waves
    sanctuary: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/restoration_40hz_hxflz8.mp3",
        description: "Rain on glass, high-altitude wind, soft sine waves",
    },
    // The Workshop - Sub-bass pulses, rhythmic wood planing, metallic resonance
    workshop: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/mechanical_zen_40hz_qw2x9p.mp3",
        description: "Sub-bass pulses, rhythmic wood planing, metallic resonance",
    },
    // The Study - Lo-fi tape hiss, distant lighthouse horn, rhythmic heartbeat
    study: {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/archival_memory_40hz_mk7n3r.mp3",
        description: "Lo-fi tape hiss, distant lighthouse horn, rhythmic heartbeat",
    },
    // The Control Room (luminous-deep) - Pure electronic hum, data flow white noise, server cooling
    "luminous-deep": {
        url: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1735258400/system_telemetry_40hz_v9p2lf.mp3",
        description: "Pure electronic hum, 1Gbps data flow white noise, server cooling",
    },
    // Fallback - Distant ocean waves
    default: {
        url: "https://assets.mixkit.co/sfx/preview/mixkit-distant-ocean-waves-1128.mp3",
        description: "Distant ocean ambience",
    },
};

// ═══════════════════════════════════════════════════════════════
// AUDIO CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════
interface AudioSovereignContextType {
    // State
    isMuted: boolean;
    volume: number;
    hasInteracted: boolean;
    isPlaying: boolean;
    currentRoom: string;

    // 40Hz Pulse Data (for visual sync)
    lowFrequencyAmplitude: number; // 0-1, the "breathing" value

    // Controls
    setMuted: (muted: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    activateSanctuary: () => void;
}

const AudioSovereignContext = createContext<AudioSovereignContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// AUDIO SOVEREIGN PROVIDER - The Heart of Immersive Sound
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
    const [lowFrequencyAmplitude, setLowFrequencyAmplitude] = useState(0);

    // Refs for Web Audio API
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const lowPassFilterRef = useRef<BiquadFilterNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Audio elements for crossfading
    const audioARef = useRef<HTMLAudioElement | null>(null);
    const audioBRef = useRef<HTMLAudioElement | null>(null);
    const activeAudioRef = useRef<"A" | "B">("A");
    const currentSourceRef = useRef<string | undefined>(undefined);

    // Animation frame for amplitude analysis
    const animationFrameRef = useRef<number | null>(null);

    // Navigation
    const pathname = usePathname();

    // Fetch scene data
    const routeSlug = pathname === "/" ? "home" : (pathname?.split("/").slice(-1)[0] || "home");
    const scene = useQuery(api.public.scenes.getScene, { slug: routeSlug });

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
    // INITIALIZE WEB AUDIO API GRAPH
    // AudioSource → LowPassFilter (40Hz emphasis) → GainNode → Destination
    //                                            ↘ AnalyserNode (for visuals)
    // ═══════════════════════════════════════════════════════════════
    const initializeAudioGraph = useCallback(() => {
        if (audioContextRef.current) return;

        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Create Gain Node (master volume)
        const gainNode = ctx.createGain();
        gainNode.gain.value = volume;
        gainNodeRef.current = gainNode;

        // Create Low-Pass Filter (40Hz emphasis for sub-bass)
        const lowPassFilter = ctx.createBiquadFilter();
        lowPassFilter.type = "lowshelf";
        lowPassFilter.frequency.value = 80; // Boost frequencies below 80Hz
        lowPassFilter.gain.value = 6; // 6dB boost to the low end
        lowPassFilterRef.current = lowPassFilter;

        // Create Analyser Node (for visual sync)
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Connect the graph
        gainNode.connect(lowPassFilter);
        lowPassFilter.connect(ctx.destination);
        gainNode.connect(analyser);

        // Create audio elements
        audioARef.current = new Audio();
        audioARef.current.crossOrigin = "anonymous";
        audioARef.current.loop = true;

        audioBRef.current = new Audio();
        audioBRef.current.crossOrigin = "anonymous";
        audioBRef.current.loop = true;

    }, [volume]);

    // ═══════════════════════════════════════════════════════════════
    // CROSSFADE LOGIC - 3 second smooth transition
    // ═══════════════════════════════════════════════════════════════
    const crossfadeToSource = useCallback((newUrl: string) => {
        if (!audioContextRef.current || !gainNodeRef.current) return;

        const ctx = audioContextRef.current;
        const fadeTime = 3; // 3 seconds crossfade
        const currentTime = ctx.currentTime;

        // Determine which audio element to use
        const newActive = activeAudioRef.current === "A" ? "B" : "A";
        const oldAudio = activeAudioRef.current === "A" ? audioARef.current : audioBRef.current;
        const newAudio = newActive === "A" ? audioARef.current : audioBRef.current;

        if (!newAudio) return;

        // Set up new audio
        newAudio.src = newUrl;
        newAudio.load();

        // Create separate gain nodes for crossfade
        const oldGain = ctx.createGain();
        const newGain = ctx.createGain();

        // Connect new audio through filter
        if (!newAudio.dataset.connected) {
            try {
                const newSource = ctx.createMediaElementSource(newAudio);
                newSource.connect(newGain);
                newGain.connect(gainNodeRef.current!);
                newAudio.dataset.connected = "true";
            } catch {
                // Source already created
            }
        }

        // Fade out old audio
        if (oldAudio && oldAudio.dataset.connected) {
            oldGain.gain.setValueAtTime(1, currentTime);
            oldGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);

            setTimeout(() => {
                oldAudio.pause();
                oldAudio.src = "";
            }, fadeTime * 1000);
        }

        // Fade in new audio
        newGain.gain.setValueAtTime(0, currentTime);
        newGain.gain.linearRampToValueAtTime(1, currentTime + fadeTime);

        if (hasInteracted && !isMuted) {
            newAudio.play().catch(() => { });
        }

        activeAudioRef.current = newActive;
        currentSourceRef.current = newUrl;
        setCurrentRoom(effectiveDomain);

    }, [hasInteracted, isMuted, effectiveDomain]);

    // ═══════════════════════════════════════════════════════════════
    // AMPLITUDE ANALYSIS - Feed the 40Hz pulse to visuals
    // ═══════════════════════════════════════════════════════════════
    const analyzeAmplitude = useCallback(() => {
        if (!analyserRef.current) {
            animationFrameRef.current = requestAnimationFrame(analyzeAmplitude);
            return;
        }

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Focus on the low frequency bins (0-80Hz range)
        // With 256 FFT and 44100Hz sample rate, each bin ≈ 172Hz
        // So bin 0-1 captures roughly 0-344Hz, we'll focus on bin 0
        const lowFreqBins = dataArray.slice(0, 3);
        const avgLowFreq = lowFreqBins.reduce((a, b) => a + b, 0) / lowFreqBins.length;

        // Normalize to 0-1
        const normalizedAmplitude = Math.min(1, avgLowFreq / 255);
        setLowFrequencyAmplitude(normalizedAmplitude);

        animationFrameRef.current = requestAnimationFrame(analyzeAmplitude);
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // CONTROLS
    // ═══════════════════════════════════════════════════════════════
    const setMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
        if (!hasInteracted) setHasInteracted(true);
    }, [hasInteracted]);

    const setVolume = useCallback((newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, newVolume));
        setVolumeState(clampedVolume);

        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = clampedVolume;
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
        if (!hasInteracted) setHasInteracted(true);
    }, [hasInteracted]);

    const activateSanctuary = useCallback(() => {
        // Resume audio context (required after user gesture)
        if (audioContextRef.current?.state === "suspended") {
            audioContextRef.current.resume();
        }

        setIsMuted(false);
        setHasInteracted(true);
        setIsPlaying(true);

        // Start amplitude analysis
        if (!animationFrameRef.current) {
            analyzeAmplitude();
        }
    }, [analyzeAmplitude]);

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════

    // Initialize on mount
    useEffect(() => {
        initializeAudioGraph();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [initializeAudioGraph]);

    // Handle source changes (crossfade between rooms)
    useEffect(() => {
        if (!hasInteracted) return;

        if (currentSourceRef.current !== targetUrl) {
            crossfadeToSource(targetUrl);
        }
    }, [targetUrl, hasInteracted, crossfadeToSource]);

    // Handle play/pause based on mute state
    useEffect(() => {
        const activeAudio = activeAudioRef.current === "A" ? audioARef.current : audioBRef.current;
        if (!activeAudio || !hasInteracted) return;

        if (isMuted) {
            activeAudio.pause();
            setIsPlaying(false);
        } else {
            activeAudio.play().catch(() => { });
            setIsPlaying(true);
        }
    }, [isMuted, hasInteracted]);

    // Update gain when volume changes
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = isMuted ? 0 : volume;
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
                lowFrequencyAmplitude,
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

    const { isMuted, volume, hasInteracted, isPlaying, lowFrequencyAmplitude, toggleMute, setVolume, activateSanctuary } = audio;

    const handleMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        setShowVolume(true);
    };

    const handleMouseLeave = () => {
        // Keep volume slider visible for a moment after leaving
        hideTimeoutRef.current = setTimeout(() => setShowVolume(false), 1500);
    };

    const handleClick = () => {
        if (!hasInteracted) {
            activateSanctuary();
        } else {
            toggleMute();
        }
    };

    // Breathing glow based on 40Hz amplitude
    const glowIntensity = 0.3 + lowFrequencyAmplitude * 0.7;

    return (
        <div
            className="fixed top-6 right-6 z-50 flex items-center gap-3"
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
                onMouseEnter={handleMouseEnter}
            >
                <div className="glass-morphic rounded-full px-4 py-2 backdrop-blur-xl bg-black/40">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        onMouseDown={(e) => e.stopPropagation()}
                        onInput={() => {
                            // Clear any pending hide timeout while actively dragging
                            if (hideTimeoutRef.current) {
                                clearTimeout(hideTimeoutRef.current);
                            }
                        }}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    />
                </div>
            </div>

            {/* Sound Wave Button */}
            <button
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
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
                        <span
                            className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"
                            style={{ animationDuration: `${1 + (1 - lowFrequencyAmplitude)}s` }}
                        />
                        <span
                            className="absolute inset-[-4px] rounded-full border border-cyan-500/30"
                            style={{
                                opacity: lowFrequencyAmplitude,
                                transform: `scale(${1 + lowFrequencyAmplitude * 0.2})`
                            }}
                        />
                    </>
                )}

                {/* Sound Wave Icon */}
                <SoundWaveIcon
                    isPlaying={isPlaying && !isMuted}
                    amplitude={lowFrequencyAmplitude}
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

// Custom Sound Wave Icon
function SoundWaveIcon({ isPlaying, amplitude, hasInteracted }: { isPlaying: boolean; amplitude: number; hasInteracted: boolean }) {
    const bars = [0.4, 0.7, 1, 0.7, 0.4];

    return (
        <div className="flex items-center justify-center w-5 h-5 gap-[2px]">
            {bars.map((baseHeight, i) => (
                <div
                    key={i}
                    className={clsx(
                        "w-[2px] rounded-full transition-all duration-150",
                        isPlaying ? "bg-cyan-400" : hasInteracted ? "bg-white/40" : "bg-white/60"
                    )}
                    style={{
                        height: isPlaying
                            ? `${(baseHeight + amplitude * 0.3) * 16}px`
                            : `${baseHeight * 8}px`,
                        transitionDelay: `${i * 30}ms`
                    }}
                />
            ))}
        </div>
    );
}
