import { Id } from "@/convex/_generated/dataModel";

// ═══════════════════════════════════════════════════════════════
// CANONICAL TYPES FOR LUMINOUS DEEP
// ═══════════════════════════════════════════════════════════════

export type Domain = "workshop" | "study" | "boathouse" | "home" | "lounge" | "kitchen" | "luminous-deep" | "orangery" | "sanctuary";
export type RevealType = "text" | "audio" | "video" | "image";
export type ChapterStatus = "draft" | "published";

// NEW: Artefact Types
export type ArtefactType = "prompt" | "regulation" | "note" | "script";
export type TruthMode = "factual" | "creative";

// NEW: Agent Voice
export type Voice = "cassie" | "eleanor" | "julian" | "sparkline" | "hearth" | "systems" | "neutral";

export interface User {
    _id: Id<"users">;
    _creationTime: number;
    name: string;
    tokenIdentifier: string;
    role?: "admin" | "user";
}

export interface Scene {
    _id: Id<"scenes">;
    _creationTime: number;
    slug: string;
    title: string;
    domain: Domain;
    backgroundMediaUrl: string;
    isPublished: boolean;
    playbackSpeed?: number;
    // NEW: Space Evolution Fields
    tagline?: string;
    mood?: string[];
    allowedTools?: string[];
}

export interface SceneObject {
    _id: Id<"objects">;
    _creationTime: number;
    sceneId: Id<"scenes">;
    name: string;
    x: number;
    y: number;
    hint: string;
    revealId: Id<"reveals">;
    role?: string;
}

export interface Reveal {
    _id: Id<"reveals">;
    _creationTime: number;
    type: RevealType;
    title: string;
    content: string;
    mediaUrl?: string;
    voice?: Voice;
    // NEW: Artefact Evolution Fields
    artefactType?: ArtefactType;
    truthMode?: TruthMode;
    spaceId?: Id<"scenes">;
}

export interface Chapter {
    _id: Id<"chapters">;
    _creationTime: number;
    slug: string;
    title: string;
    content: string;
    status: ChapterStatus;
}

// NEW: Agent Type
export interface Agent {
    _id: Id<"agents">;
    _creationTime: number;
    name: string;
    homeSpaceId: Id<"scenes">;
    role: string;
    description?: string;
    capabilities: string[];
    tools: string[];
    autonomy: number;
    voice?: Voice;
    isActive: boolean;
    createdAt: number;
}

// NEW: Workflow Type
export interface Workflow {
    _id: Id<"workflows">;
    _creationTime: number;
    name: string;
    spaceId: Id<"scenes">;
    description?: string;
    trigger: {
        type: "manual" | "schedule" | "event" | "condition";
        config?: any;
    };
    steps: Array<{
        order: number;
        agentId?: Id<"agents">;
        action: string;
        params?: any;
        inputFrom?: number;
    }>;
    isActive: boolean;
    createdAt: number;
}

// NEW: Run Type
export interface Run {
    _id: Id<"runs">;
    _creationTime: number;
    workflowId: Id<"workflows">;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    logs: Array<{
        timestamp: number;
        stepOrder: number;
        agentId?: Id<"agents">;
        message: string;
        level: "info" | "warn" | "error" | "debug";
        data?: any;
    }>;
    producedArtefactIds: Id<"reveals">[];
    startedAt: number;
    completedAt?: number;
    triggeredBy?: string;
}

