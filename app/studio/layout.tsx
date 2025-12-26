"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SyncMediaButton } from "@/components/studio/SyncMediaButton";
import { LayoutDashboard, FileEdit, Image, Users, Share2, BookOpen, PenTool, Globe } from "lucide-react";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/studio", icon: LayoutDashboard },
        { label: "World Map", href: "/studio/world", icon: Globe },
        { label: "Content Factory", href: "/studio/content", icon: FileEdit },
        { label: "Book Creator", href: "/studio/books", icon: PenTool },
        { label: "The Library", href: "/studio/signals", icon: BookOpen },
        { label: "Media Library", href: "/studio/media", icon: Image },
        { label: "Agent Manager", href: "/studio/agents", icon: Users },
        { label: "Social Studio", href: "/studio/social", icon: Share2 },
    ];


    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-800">Luminous Studio</h1>
                    <p className="text-xs text-gray-500 mt-1">Content Management</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item: any) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== "/studio" && pathname.startsWith(item.href + "/"));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon className={clsx(
                                    "w-4 h-4 transition-colors",
                                    isActive ? "text-indigo-600" : "text-gray-400"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-4">
                    <SyncMediaButton />
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                        <UserButton afterSignOutUrl="/" />
                        <span className="text-sm text-gray-600 font-bold">Admin</span>
                    </div>
                </div>

            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
