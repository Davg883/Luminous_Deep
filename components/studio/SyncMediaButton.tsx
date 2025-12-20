"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function SyncMediaButton() {
    const sync = useAction(api.studio.media.syncMedia);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await sync();
            alert(`Sync complete! ${result.count} assets indexed.`);
        } catch (e) {
            alert("Sync failed. Check console for details.");
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-md transition-all disabled:opacity-50"
        >
            {isSyncing ? (
                <>
                    <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    Syncing...
                </>
            ) : (
                <>
                    <span>🔄</span>
                    Sync Media Library
                </>
            )}
        </button>
    );
}
