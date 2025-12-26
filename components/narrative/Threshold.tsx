"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const imgReality = "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766747029/arch_izrqhm.png";
const imgWarp = "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766747029/transistion_mswypd.png";
const imgWonderland = "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766747029/secret_room_va2d3l.png";

const Threshold = () => {
    const [sequence, setSequence] = useState('idle'); // idle, warping, arrived
    const [weatherInput, setWeatherInput] = useState('');
    const [isCalibrating, setIsCalibrating] = useState(false);
    const router = useRouter();

    const handleEnter = () => {
        setSequence('warping');

        // Timing the transition to "Arrived"
        setTimeout(() => {
            setSequence('arrived');
        }, 2500); // 2.5 seconds of warp speed
    };

    const handleCalibration = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCalibrating(true);
        setTimeout(() => {
            console.log("Routing to Personal Sanctuary...");
            // router.push('/sanctuary'); // TODO: Define the destination route
        }, 2000);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-stone-950 text-white font-serif selection:bg-rose-500/30">

            {/* --- LAYER 1: REALITY (The Archway) --- */}
            <div
                className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out ${sequence === 'idle' ? 'scale-100 opacity-100' : 'scale-[3] opacity-0'
                    }`}
                style={{ backgroundImage: `url(${imgReality})` }}
            />

            {/* --- LAYER 2: THE WARP (The Bridge) --- */}
            <div
                className={`absolute inset-0 bg-cover bg-center mix-blend-screen transition-all duration-[2000ms] ease-linear ${sequence === 'warping' ? 'opacity-100 scale-125' : 'opacity-0 scale-100'
                    }`}
                style={{ backgroundImage: `url(${imgWarp})` }}
            />

            {/* --- LAYER 3: WONDERLAND (The Sanctuary) --- */}
            <div
                className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out ${sequence === 'arrived' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-xl'
                    }`}
                style={{ backgroundImage: `url(${imgWonderland})` }}
            >
                {/* Inner Atmosphere Layer */}
                <div className="absolute inset-0 bg-stone-950/40 backdrop-saturate-150" />
            </div>

            {/* --- UI: THE TRIGGER --- */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${sequence === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none scale-150'}`}>
                <button
                    onClick={handleEnter}
                    className="group relative px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full overflow-hidden transition-all hover:bg-white/20 hover:scale-105 hover:border-rose-200/50 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                    <span className="relative z-10 flex items-center gap-3 font-sans text-sm tracking-[0.25em] uppercase text-white">
                        Enter The Deep <ArrowRight className="w-4 h-4" />
                    </span>
                </button>
            </div>

            {/* --- UI: JULIAN'S CALIBRATION --- */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 delay-500 ${sequence === 'arrived' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>

                {!isCalibrating ? (
                    <div className="max-w-xl w-full px-6 text-center">
                        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1 rounded-full bg-stone-900/60 border border-white/10 backdrop-blur-md">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="font-mono text-[10px] tracking-widest text-stone-400 uppercase">Sanctuary Link Established</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl mb-8 leading-tight text-white font-light drop-shadow-2xl">
                            "The noise is gone.<br />
                            <span className="text-rose-200 italic font-medium">How do you feel?</span>"
                        </h2>

                        <form onSubmit={handleCalibration} className="relative max-w-md mx-auto">
                            <input
                                type="text"
                                value={weatherInput}
                                onChange={(e) => setWeatherInput(e.target.value)}
                                placeholder="e.g. Tired, anxious, hopeful..."
                                className="w-full bg-stone-950/60 border border-white/10 rounded-2xl px-6 py-6 text-xl text-center text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 focus:bg-stone-900/80 transition-all font-sans backdrop-blur-xl shadow-2xl"
                                autoFocus
                            />
                        </form>
                    </div>
                ) : (
                    <div className="text-center">
                        <Sparkles className="w-10 h-10 text-rose-400 animate-pulse mx-auto mb-6" />
                        <p className="font-mono text-xs tracking-[0.3em] text-stone-300">ADAPTING ENVIRONMENT...</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Threshold;
