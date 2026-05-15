"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { Server, Save, X, Network, Lock, Fingerprint } from "lucide-react";

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
            router.push(`/workspaces/${workspaceIdInt}/proxmox`);
            router.refresh();
        } catch {
            alert("Gagal menyimpan koneksi");
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
        <div className="min-h-screen z-1 bg-base-200 font-sans lg:pl-72 pt-16">
            <div className="p-6 md:p-10 max-w-6xl mx-auto">
                {/* ── PAGE HEADER ── */}
                <div className="mb-10">
                    <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
                        <span className="inline-block h-px w-6 bg-primary"></span>
                        New Connection
                    </p>
                    <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-3">
                        Add <span className="text-primary">Proxmox</span>
                    </h1>
                    {/* <p className="text-sm opacity-50 font-medium max-w-md">
                        Hubungkan infrastruktur Proxmox VE ke workspace Anda untuk mulai memonitoring node dan virtual machine.
                    </p> */}
                </div>

                {/* ── FORM CARD ── */}
                <div className="bg-base-100 rounded-[2rem] border border-base-300 shadow-xl overflow-hidden relative transition-all">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Server size={200} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 md:p-10 relative z-10 space-y-8">
                        {/* Section: General Info */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 pb-2 border-b border-base-300">
                                <Network size={18} className="text-primary" />
                                <h3 className="font-bold text-sm tracking-widest uppercase opacity-60">General Information</h3>
                            </div>
                            
                            <div className="form-control w-full">
                                <label className="label pt-0 pb-1.5">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Connection Name</span>
                                </label>
                                <input
                                    required
                                    name="proxmox_connection_name"
                                    value={formData.proxmox_connection_name}
                                    placeholder="e.g. Production Cluster"
                                    className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 transition-colors"
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="form-control w-full md:col-span-3">
                                    <label className="label pt-0 pb-1.5">
                                        <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Host (IP / Domain)</span>
                                    </label>
                                    <input
                                        required
                                        name="proxmox_host"
                                        value={formData.proxmox_host}
                                        placeholder="192.168.1.10"
                                        className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 font-mono md:font-sans transition-colors"
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-control w-full">
                                    <label className="label pt-0 pb-1.5">
                                        <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Port</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="proxmox_port"
                                        value={formData.proxmox_port}
                                        className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 font-mono transition-colors"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-control w-full">
                                <label className="label pt-0 pb-1.5">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Description / Notes</span>
                                    <span className="label-text-alt opacity-50">Optional</span>
                                </label>
                                <textarea
                                    name="proxmox_description"
                                    value={formData.proxmox_description}
                                    rows={3}
                                    placeholder="Write a short description about this node..."
                                    className="textarea textarea-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 transition-colors"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Section: Authentication */}
                        <div className="space-y-5 pt-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-base-300">
                                <Lock size={18} className="text-secondary" />
                                <h3 className="font-bold text-sm tracking-widest uppercase opacity-60">Authentication API</h3>
                            </div>

                            <div className="form-control w-full">
                                <label className="label pt-0 pb-1.5">
                                    <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Proxmox Username</span>
                                </label>
                                <input
                                    required
                                    name="proxmox_username"
                                    value={formData.proxmox_username}
                                    placeholder="root@pam"
                                    className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 font-mono transition-colors opacity-80"
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="form-control w-full">
                                    <label className="label pt-0 pb-1.5">
                                        <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Token ID Name</span>
                                    </label>
                                    <input
                                        required
                                        name="proxmox_token_name"
                                        value={formData.proxmox_token_name}
                                        placeholder="monitoring-token"
                                        className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 transition-colors font-mono"
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-control w-full">
                                    <label className="label pt-0 pb-1.5">
                                        <span className="label-text font-bold text-xs uppercase tracking-wider opacity-70">Token Secret</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="password"
                                            name="proxmox_token_secret"
                                            value={formData.proxmox_token_secret}
                                            placeholder="UUID-XXXX-XXXX"
                                            className="input input-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 font-mono pr-10 transition-colors"
                                            onChange={handleChange}
                                        />
                                        <Fingerprint className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-base-300">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-ghost rounded-2xl flex-1 font-bold bg-base-200/50 shadow-sm border border-transparent"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary rounded-2xl flex-1 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform"
                            >
                                {loading ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Save Connection
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}