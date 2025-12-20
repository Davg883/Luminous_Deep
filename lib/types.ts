import { Id } from "@/convex/_generated/dataModel";

export type Domain = "workshop" | "study" | "boathouse" | "home";
export type RevealType = "text" | "audio" | "video" | "image";
export type ChapterStatus = "draft" | "published";

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
}

export interface Reveal {
    _id: Id<"reveals">;
    _creationTime: number;
    type: RevealType;
    title: string;
    content: string;
    mediaUrl?: string;
}

export interface Chapter {
    _id: Id<"chapters">;
    _creationTime: number;
    slug: string;
    title: string;
    content: string;
    status: ChapterStatus;
}
