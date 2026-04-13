"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function AddProxmoxPage() {
    const router = useRouter();
    const params = useParams();
      const workspace_id = params?.workspace_id as string;
      const workspaceIdInt = parseInt(workspace_id, 10);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        proxmox_connection_name: "",
        proxmox_description: "",
        proxmox_host: "",
        proxmox_port: 8006,
        proxmox_username: "root@pam",
        proxmox_token_name: "",
        proxmox_token_secret: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post(`/api/workspaces/${workspaceIdInt}/proxmox`, formData);
            router.push(`/workspaces/${workspaceIdInt}/proxmox`); // Redirect ke list proxmox
            router.refresh();
        } catch {
            alert("Gagal menyimpan koneksi: ");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "proxmox_port" ? parseInt(value) || 0 : value,
        }));
    };

    return (
        <div className="min-h-screen bg-base-200/50 text-base-content font-sans p-6 pt-20 lg:pl-72 transition-all">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add Proxmox Connection</h1>
                <p className="text-gray-500">Hubungkan infrastruktur Proxmox VE Anda ke workspace ini.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
                {/* Connection Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">Connection Name</label>
                    <input
                        required
                        name="proxmox_connection_name"
                        placeholder="e.g. Production Cluster"
                        className="w-full p-2 border rounded-md"
                        onChange={handleChange}
                    />
                </div>

                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Host (IP/Domain)</label>
                        <input
                            required
                            name="proxmox_host"
                            placeholder="192.168.1.10"
                            className="w-full p-2 border rounded-md"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Port</label>
                        <input
                            type="number"
                            name="proxmox_port"
                            defaultValue={8006}
                            className="w-full p-2 border rounded-md"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Username */}
                <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input
                        required
                        name="proxmox_username"
                        placeholder="root@pam"
                        className="w-full p-2 border rounded-md"
                        onChange={handleChange}
                    />
                </div>

                {/* API Token Info */}
                <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Token ID Name</label>
                        <input
                            required
                            name="proxmox_token_name"
                            placeholder="monitoring-token"
                            className="w-full p-2 border rounded-md"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Token Secret</label>
                        <input
                            required
                            type="password"
                            name="proxmox_token_secret"
                            placeholder="UUID-XXXX-XXXX"
                            className="w-full p-2 border rounded-md"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                    <textarea
                        name="proxmox_description"
                        rows={3}
                        className="w-full p-2 border rounded-md"
                        onChange={handleChange}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${loading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                    >
                        {loading ? "Menyimpan..." : "Simpan Koneksi"}
                    </button>
                </div>
            </form>
        </div>
    );
}