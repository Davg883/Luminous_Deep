"use client";

import React, { useState } from 'react';
import { Lock, Play, Eye, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════════
// ASSET CARD - Reusable visual card with cover image
// ═══════════════════════════════════════════════════════════════
export interface AssetCardProps {
    id: string;
    title: string;
    subtitle?: string;
    coverImage?: string;
    badge?: string; // e.g., "S0 E1"
    badgeColor?: 'emerald' | 'amber' | 'violet' | 'rose' | 'blue';
    isLocked?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
    onQuickView?: () => void;
    variant?: 'compact' | 'full';
    className?: string;
}

export function AssetCard({
    id,
    title,
    subtitle,
    coverImage,
    badge,
    badgeColor = 'emerald',
    isLocked,
    isSelected,
    onClick,
    onQuickView,
    variant = 'full',
    className,
}: AssetCardProps) {
    const [imageError, setImageError] = useState(false);

    const badgeColors = {
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    const hasValidImage = coverImage && !imageError;

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
                "border hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1",
                isSelected
                    ? "ring-2 ring-emerald-500 border-emerald-500/50 bg-emerald-950/20"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20",
                variant === 'compact' ? 'aspect-[3/4]' : 'aspect-[2/3]',
                className
            )}
        >
            {/* Cover Image */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                {hasValidImage ? (
                    <img
                        src={coverImage}
                        alt={title}
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center p-4">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-white/5 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-slate-600" />
                            </div>
                            <span className="text-[10px] font-mono text-slate-600 uppercase">No Cover</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

            {/* Lock overlay */}
            {isLocked && (
                <div className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 backdrop-blur-sm">
                    <Lock className="w-3 h-3 text-rose-400" />
                </div>
            )}

            {/* Badge */}
            {badge && (
                <div className={clsx(
                    "absolute top-3 left-3 px-2 py-1 rounded-md border backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wider",
                    badgeColors[badgeColor]
                )}>
                    {badge}
                </div>
            )}

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-serif text-sm text-white font-medium leading-tight line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-mono uppercase tracking-wider">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Hover Actions */}
            {onQuickView && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <button
                        onClick={(e) => { e.stopPropagation(); onQuickView(); }}
                        className="p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all"
                    >
                        <Eye className="w-5 h-5 text-white" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ASSET GRID - Responsive grid layout for asset cards
// ═══════════════════════════════════════════════════════════════
export interface AssetGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4 | 5 | 6;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function AssetGrid({
    children,
    columns = 4,
    gap = 'md',
    className
}: AssetGridProps) {
    const columnClasses = {
        2: 'grid-cols-2',
        3: 'grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };

    const gapClasses = {
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
    };

    return (
        <div className={clsx(
            'grid',
            columnClasses[columns],
            gapClasses[gap],
            className
        )}>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// QUICK VIEW MODAL - Reusable modal for asset details (with edit support)
// ═══════════════════════════════════════════════════════════════
export interface QuickViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    coverImage?: string;
    summary?: string;
    badge?: string;
    badgeColor?: 'emerald' | 'amber' | 'violet' | 'rose' | 'blue';
    children?: React.ReactNode;
    // Edit support
    editable?: boolean;
    itemId?: string;
    stratum?: string;
    onSave?: (updates: { coverImage?: string; stratum?: string; title?: string; subtitle?: string }) => Promise<void>;
}

export function QuickViewModal({
    isOpen,
    onClose,
    title: initialTitle,
    subtitle: initialSubtitle,
    coverImage: initialCoverImage,
    summary,
    badge,
    badgeColor = 'emerald',
    children,
    editable = false,
    itemId,
    stratum: initialStratum,
    onSave,
}: QuickViewModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit form state
    const [editTitle, setEditTitle] = useState(initialTitle);
    const [editSubtitle, setEditSubtitle] = useState(initialSubtitle || '');
    const [editCoverImage, setEditCoverImage] = useState(initialCoverImage || '');
    const [editStratum, setEditStratum] = useState(initialStratum || 'signal');

    // Reset form when modal opens with new data
    React.useEffect(() => {
        setEditTitle(initialTitle);
        setEditSubtitle(initialSubtitle || '');
        setEditCoverImage(initialCoverImage || '');
        setEditStratum(initialStratum || 'signal');
        setIsEditing(false);
    }, [initialTitle, initialSubtitle, initialCoverImage, initialStratum]);

    if (!isOpen) return null;

    const badgeColors = {
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave({
                title: editTitle !== initialTitle ? editTitle : undefined,
                subtitle: editSubtitle !== initialSubtitle ? editSubtitle : undefined,
                coverImage: editCoverImage !== initialCoverImage ? editCoverImage : undefined,
                stratum: editStratum !== initialStratum ? editStratum : undefined,
            });
            setIsEditing(false);
        } catch (e) {
            console.error('Failed to save:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with image */}
                    <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-950">
                        {(isEditing ? editCoverImage : initialCoverImage) && (
                            <img
                                src={isEditing ? editCoverImage : initialCoverImage}
                                alt={isEditing ? editTitle : initialTitle}
                                className="w-full h-full object-cover opacity-60"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>

                        {/* Title overlay (view mode) */}
                        {!isEditing && (
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                {badge && (
                                    <span className={clsx(
                                        "inline-block px-2 py-1 rounded border text-[10px] font-mono font-bold uppercase mb-2",
                                        badgeColors[badgeColor]
                                    )}>
                                        {badge}
                                    </span>
                                )}
                                <h2 className="text-2xl font-serif text-white font-bold">{initialTitle}</h2>
                                {initialSubtitle && (
                                    <p className="text-sm text-slate-400 mt-1">{initialSubtitle}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isEditing ? (
                            /* ═══════════════════════════════════════
                               EDIT MODE
                            ═══════════════════════════════════════ */
                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 uppercase mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 focus:outline-none"
                                    />
                                </div>

                                {/* Subtitle */}
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 uppercase mb-2">Subtitle</label>
                                    <input
                                        type="text"
                                        value={editSubtitle}
                                        onChange={(e) => setEditSubtitle(e.target.value)}
                                        placeholder="Episode subtitle..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
                                    />
                                </div>

                                {/* Cover Image URL */}
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 uppercase mb-2">Cover Image URL</label>
                                    <input
                                        type="url"
                                        value={editCoverImage}
                                        onChange={(e) => setEditCoverImage(e.target.value)}
                                        placeholder="https://res.cloudinary.com/..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none font-mono text-xs"
                                    />
                                    {editCoverImage && (
                                        <div className="mt-2 h-24 rounded-lg overflow-hidden bg-slate-800">
                                            <img
                                                src={editCoverImage}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Stratum Dropdown */}
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 uppercase mb-2">Stratum (Column)</label>
                                    <select
                                        value={editStratum}
                                        onChange={(e) => setEditStratum(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="signal" className="bg-slate-900">Signal (Green)</option>
                                        <option value="myth" className="bg-slate-900">Myth (Purple)</option>
                                        <option value="reflection" className="bg-slate-900">Reflection (Blue)</option>
                                    </select>
                                </div>

                                {/* Save/Cancel Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ═══════════════════════════════════════
                               VIEW MODE
                            ═══════════════════════════════════════ */
                            <>
                                {summary && (
                                    <p className="text-slate-300 leading-relaxed mb-6">{summary}</p>
                                )}
                                {editable ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={handleClose}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                ) : (
                                    children
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// KANBAN COLUMN - For World Map view
// ═══════════════════════════════════════════════════════════════
export interface KanbanColumnProps {
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    color: 'gold' | 'purple' | 'green' | 'blue';
    count?: number;
    children: React.ReactNode;
    className?: string;
}

export function KanbanColumn({
    title,
    subtitle,
    icon: Icon,
    color,
    count,
    children,
    className
}: KanbanColumnProps) {
    const colorStyles = {
        gold: {
            header: 'bg-amber-500/10 border-amber-500/30',
            icon: 'text-amber-500',
            accent: 'bg-amber-500',
        },
        purple: {
            header: 'bg-violet-500/10 border-violet-500/30',
            icon: 'text-violet-500',
            accent: 'bg-violet-500',
        },
        green: {
            header: 'bg-emerald-500/10 border-emerald-500/30',
            icon: 'text-emerald-500',
            accent: 'bg-emerald-500',
        },
        blue: {
            header: 'bg-blue-500/10 border-blue-500/30',
            icon: 'text-blue-500',
            accent: 'bg-blue-500',
        },
    };

    const styles = colorStyles[color];

    return (
        <div className={clsx(
            "flex flex-col min-w-[280px] max-w-[320px] bg-white/[0.02] rounded-xl border border-white/5",
            className
        )}>
            {/* Column Header */}
            <div className={clsx(
                "flex items-center gap-3 p-4 border-b rounded-t-xl",
                styles.header
            )}>
                <div className={clsx("p-2 rounded-lg bg-white/5", styles.icon)}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                    {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
                </div>
                {count !== undefined && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-slate-400">
                        {count}
                    </span>
                )}
            </div>

            {/* Column Content - Scrollable */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[60vh]">
                {children}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// KANBAN CARD - Compact card for Kanban columns
// ═══════════════════════════════════════════════════════════════
export interface KanbanCardProps {
    title: string;
    subtitle?: string;
    coverImage?: string;
    isLocked?: boolean;
    onClick?: () => void;
}

export function KanbanCard({
    title,
    subtitle,
    coverImage,
    isLocked,
    onClick
}: KanbanCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition-all"
        >
            <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-12 h-16 rounded-md bg-slate-800 overflow-hidden flex-shrink-0">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-slate-600" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                        {title}
                    </h4>
                    {subtitle && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{subtitle}</p>
                    )}
                </div>

                {/* Lock indicator */}
                {isLocked && (
                    <Lock className="w-3 h-3 text-rose-400 flex-shrink-0" />
                )}
            </div>
        </div>
    );
}
