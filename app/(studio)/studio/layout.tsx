"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SyncMediaButton } from "@/components/studio/SyncMediaButton";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/studio" },
        { label: "Content Factory", href: "/studio/content" },
        { label: "Media Library", href: "/studio/media" }, // Placeholder
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
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "block px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                pathname === item.href || pathname.startsWith(item.href + "/")
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
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
