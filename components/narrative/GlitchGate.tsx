'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GlitchGateProps {
    content: string;
    isLocked: boolean;
    glitchPoint?: number;
}

// Custom components for beautiful markdown rendering
const MarkdownComponents = {
    // Headings with beautiful gradients and spacing
    h1: ({ children }: any) => (
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-stone-100 via-stone-200 to-stone-400 mt-16 mb-8 font-serif tracking-tight leading-tight">
            {children}
        </h1>
    ),
    h2: ({ children }: any) => (
        <h2 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-stone-200 to-stone-400 mt-14 mb-6 font-serif tracking-tight border-b border-stone-800/50 pb-4">
            {children}
        </h2>
    ),
    h3: ({ children }: any) => (
        <h3 className="text-xl md:text-2xl font-medium text-stone-200 mt-10 mb-4 font-serif tracking-tight">
            {children}
        </h3>
    ),
    h4: ({ children }: any) => (
        <h4 className="text-lg font-medium text-stone-300 mt-8 mb-3 font-serif uppercase tracking-widest text-sm">
            {children}
        </h4>
    ),

    // Paragraphs with proper spacing and line height
    p: ({ children, node }: any) => {
        // Check if this paragraph starts a new section (after a heading)
        const text = String(children);
        return (
            <p className="text-stone-300 text-lg md:text-xl leading-[1.9] mb-8 font-serif first-of-type:first-letter:text-5xl first-of-type:first-letter:font-bold first-of-type:first-letter:text-stone-100 first-of-type:first-letter:float-left first-of-type:first-letter:mr-3 first-of-type:first-letter:mt-1 first-of-type:first-letter:leading-none">
                {children}
            </p>
        );
    },

    // Blockquotes with emerald accent
    blockquote: ({ children }: any) => (
        <blockquote className="my-10 pl-6 border-l-2 border-emerald-600/50 bg-gradient-to-r from-emerald-950/30 to-transparent py-4 pr-4 rounded-r-lg">
            <div className="text-stone-400 italic font-serif text-lg leading-relaxed">
                {children}
            </div>
        </blockquote>
    ),

    // Emphasis and strong
    em: ({ children }: any) => (
        <em className="text-stone-200 italic not-italic font-medium">{children}</em>
    ),
    strong: ({ children }: any) => (
        <strong className="text-stone-100 font-bold">{children}</strong>
    ),

    // Horizontal rule as section divider
    hr: () => (
        <div className="my-16 flex items-center justify-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-stone-700" />
            <div className="w-2 h-2 rotate-45 border border-stone-700" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-stone-700" />
        </div>
    ),

    // Lists with custom styling
    ul: ({ children }: any) => (
        <ul className="my-8 space-y-3 pl-4">
            {children}
        </ul>
    ),
    ol: ({ children }: any) => (
        <ol className="my-8 space-y-3 pl-4 list-decimal list-inside marker:text-emerald-600">
            {children}
        </ol>
    ),
    li: ({ children }: any) => (
        <li className="text-stone-300 text-lg leading-relaxed font-serif pl-2 relative before:content-['◆'] before:absolute before:-left-4 before:text-emerald-600/50 before:text-xs before:top-2">
            {children}
        </li>
    ),

    // Code blocks (inline)
    code: ({ children, className }: any) => {
        // Check if it's a code block or inline code
        const isBlock = className?.includes('language-');
        if (isBlock) {
            return (
                <code className="block my-8 p-6 bg-black/50 border border-stone-800 rounded-lg font-mono text-sm text-emerald-400 overflow-x-auto">
                    {children}
                </code>
            );
        }
        return (
            <code className="px-2 py-0.5 bg-stone-800/50 border border-stone-700/50 rounded text-emerald-400 font-mono text-sm">
                {children}
            </code>
        );
    },

    // Links
    a: ({ children, href }: any) => (
        <a
            href={href}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-600/50 hover:decoration-emerald-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
};

// Render markdown content with beautiful styling
function FormattedContent({ content }: { content: string }) {
    return (
        <div className="story-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default function GlitchGate({ content, isLocked, glitchPoint }: GlitchGateProps) {
    // Unlocked content - render full markdown
    if (!isLocked || !glitchPoint || content.length <= glitchPoint) {
        return (
            <div className="max-w-none">
                <FormattedContent content={content} />
            </div>
        );
    }

    // Locked content - show partial with glitch effect
    const safeText = content.slice(0, glitchPoint);
    const corruptedLines = [
        "§±‡˜‰ 0xERR_BF9... CONNECTION SEVERED",
        "SYSTEM HALT: UNKNOWN PROTOCOL DETECTED",
        "††† ...RE-ROUTING... FAILED..."
    ];

    return (
        <div className="relative">
            {/* Safe Readable Text with Waterfall Fade */}
            <div
                className="max-w-none mb-0 pb-8"
                style={{
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                }}
            >
                <FormattedContent content={safeText} />
                <span className="inline-block w-2 h-4 align-middle bg-emerald-500 animate-pulse ml-1 opacity-50" />
            </div>

            {/* Corrupted Zone */}
            <div className="relative overflow-hidden p-8 border border-neutral-800 bg-neutral-900/50 rounded-lg backdrop-blur-sm min-h-[350px]">
                <div className="absolute inset-0 pointer-events-none opacity-50"
                    style={{
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
                    }}
                />

                {corruptedLines.map((line, i) => (
                    <div key={i} className="font-mono text-xs text-red-900/40 blur-[1px] select-none mb-1">
                        {line}
                    </div>
                ))}

                {/* The Glass Panel Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-6 border border-rose-900/30 bg-black/80 rounded-xl shadow-2xl max-w-sm"
                    >
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-rose-500/10 rounded-full border border-rose-500/20">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                        </div>

                        <h3 className="text-xl font-mono font-bold text-rose-500 tracking-widest mb-2">SIGNAL LOST</h3>
                        <p className="text-stone-500 text-xs font-mono mb-6 uppercase tracking-wider">Transmission Interrupted</p>

                        <button
                            onClick={() => alert("Payment Gateway Integration Pending")}
                            className="w-full py-3 px-4 bg-rose-950/50 border border-rose-500 text-rose-400 font-mono text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 hover:bg-rose-900/80 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all animate-pulse"
                        >
                            [ RESTORE FEED // £0.99 ]
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
