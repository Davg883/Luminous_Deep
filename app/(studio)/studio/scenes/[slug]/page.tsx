"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Domain } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export default function SceneEditorPage() {
    const { slug } = useParams();
    const sceneData = useQuery(api.studio.scenes.getScene, { slug: slug as string });
    const updateScene = useMutation(api.studio.scenes.updateScene);
    const addObject = useMutation(api.studio.scenes.addObject);
    const deleteObject = useMutation(api.studio.scenes.deleteObject);

    const [isObjectModalOpen, setIsObjectModalOpen] = useState(false);
    const [newObject, setNewObject] = useState({ name: "", x: 50, y: 50 });
    const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

    if (sceneData === undefined) return <div>Loading...</div>;
    if (sceneData === null) return <div>Scene not found</div>;

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await updateScene({
            id: sceneData._id,
            title: formData.get("title") as string,
            backgroundMediaUrl: formData.get("backgroundMediaUrl") as string,
            domain: formData.get("domain") as Domain,
        });
        alert("Saved!");
    };

    const handleAddObject = async () => {
        await addObject({
            sceneId: sceneData._id,
            ...newObject
        });
        setIsObjectModalOpen(false);
        setNewObject({ name: "", x: 50, y: 50 });
    };

    const handleInteractClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Logic for calculating position relative to the container
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

        setClickPos({ x, y });
        setNewObject(prev => ({ ...prev, x, y }));

        // Open modal automatically
        setIsObjectModalOpen(true);
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Edit Scene: {sceneData.title}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Visual Editor */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium">Visual Editor</h2>
                    <div
                        className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-indigo-500/20 cursor-crosshair group"
                        onClick={handleInteractClick}
                    >
                        {/* Background Media Preview */}
                        {sceneData.backgroundMediaUrl.endsWith('.mp4') ? (
                            <video src={sceneData.backgroundMediaUrl} className="w-full h-full object-cover opacity-50" muted playsInline />
                        ) : (
                            <img src={sceneData.backgroundMediaUrl} className="w-full h-full object-cover opacity-50" />
                        )}

                        {/* Tooltip */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Click anywhere to place object
                        </div>

                        {/* Existing Objects */}
                        {sceneData.objects?.map(obj => (
                            <div
                                key={obj._id}
                                className="absolute w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                                style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                                title={`${obj.name} (${obj.x}%, ${obj.y}%)`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Maybe enable drag edit later
                                }}
                            />
                        ))}

                        {/* Ghost Dot (Click Preview) */}
                        {isObjectModalOpen && (
                            <div
                                className="absolute w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-ping-slow"
                                style={{ left: `${newObject.x}%`, top: `${newObject.y}%` }}
                            />
                        )}
                    </div>
                    <div className="text-sm text-gray-500">
                        Click on the canvas to precise-place an object. The coordinates will auto-fill.
                    </div>
                </div>

                {/* Right Column: Settings Form */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-medium mb-4">Settings</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input name="title" defaultValue={sceneData.title} className="mt-1 block w-full border p-2 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Domain</label>
                                <select name="domain" defaultValue={sceneData.domain} className="mt-1 block w-full border p-2 rounded-md bg-white">
                                    <option value="workshop">Workshop</option>
                                    <option value="study">Study</option>
                                    <option value="boathouse">Boathouse</option>
                                    <option value="home">Home</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Media URL</label>
                                <input name="backgroundMediaUrl" defaultValue={sceneData.backgroundMediaUrl} className="mt-1 block w-full border p-2 rounded-md" />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Update Scene</button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Objects List */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Interactive Objects List</h2>
                    <button onClick={() => { setIsObjectModalOpen(true); setNewObject({ name: "", x: 50, y: 50 }); }} className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 text-sm">Manual Add</button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Position</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sceneData.objects?.map(obj => (
                            <tr key={obj._id}>
                                <td className="px-4 py-2 text-sm">{obj.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{obj.x}%, {obj.y}%</td>
                                <td className="px-4 py-2 text-right">
                                    <button onClick={() => deleteObject({ id: obj._id })} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Object Modal */}
            {isObjectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">Add Object</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Name</label>
                                <input
                                    value={newObject.name}
                                    onChange={e => setNewObject({ ...newObject, name: e.target.value })}
                                    placeholder="Object Name"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">X (%)</label>
                                    <input
                                        type="number"
                                        value={newObject.x}
                                        onChange={e => setNewObject({ ...newObject, x: parseInt(e.target.value) })}
                                        className="w-full border p-2 rounded bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Y (%)</label>
                                    <input
                                        type="number"
                                        value={newObject.y}
                                        onChange={e => setNewObject({ ...newObject, y: parseInt(e.target.value) })}
                                        className="w-full border p-2 rounded bg-gray-50"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsObjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleAddObject} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Add Object</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
