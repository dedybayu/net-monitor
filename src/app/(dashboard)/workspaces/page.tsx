"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Workspace {
  workspace_id: number;
  workspace_name: string;
  workspace_description: string;
  permission: string;
  created_at?: string;
}

const PERMISSION_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  admin:    { label: "Admin",    color: "text-error",   dot: "bg-error" },
  owner:    { label: "Owner",    color: "text-warning", dot: "bg-warning" },
  editor:   { label: "Editor",  color: "text-primary",  dot: "bg-primary" },
  viewer:   { label: "Viewer",  color: "text-success",  dot: "bg-success" },
};

const getPermConfig = (p: string) =>
  PERMISSION_CONFIG[p?.toLowerCase()] ?? { label: p, color: "text-base-content/50", dot: "bg-base-content/30" };

// Warna latar kartu berdasarkan indeks — memberi variasi visual
const CARD_ACCENTS = [
  "from-primary/8",
  "from-secondary/8",
  "from-accent/8",
  "from-info/8",
  "from-success/8",
  "from-warning/8",
];

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => { setWorkspaces(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openModal = (ws: Workspace) => {
    setSelectedWs(ws);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 pt-16 lg:pl-64 gap-5">
        <div className="relative">
          <span className="loading loading-ring loading-lg text-primary"></span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary animate-ping"></div>
          </div>
        </div>
        <p className="text-xs font-black tracking-[0.3em] uppercase opacity-40 animate-pulse">
          Loading Workspaces
        </p>
      </div>
    );
  }

  return (
    /* pt-16 = navbar height, lg:pl-64 = sidebar width */
    <div className="min-h-screen bg-base-200 pt-16 lg:pl-64 font-sans">

      {/* ── PAGE CONTENT ──────────────────────────────────────────── */}
      <div className="p-6 md:p-10 max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            {/* Eyebrow */}
            <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-primary"></span>
              Network Environments
            </p>
            <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content">
              Work<span className="text-primary">spaces</span>
            </h1>
            <p className="text-sm opacity-50 mt-2 font-medium">
              {workspaces.length} environment{workspaces.length !== 1 ? "s" : ""} available
            </p>
          </div>

          <button className="btn btn-primary rounded-2xl gap-2 px-6 shadow-lg shadow-primary/20 font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        </div>

        {/* EMPTY STATE */}
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-base-100 rounded-3xl border-2 border-dashed border-base-300 py-32 px-10 text-center">
            <div className="text-7xl mb-6 opacity-30">⬡</div>
            <h3 className="text-2xl font-black tracking-tight mb-2">No Workspaces Yet</h3>
            <p className="text-sm opacity-50 mb-8 max-w-xs">
              You havent been assigned to any workspace. Create one or ask an admin.
            </p>
            <button className="btn btn-outline btn-sm rounded-xl font-bold">Refresh</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {workspaces.map((ws, i) => {
              const perm = getPermConfig(ws.permission);
              const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
              return (
                <div
                  key={ws.workspace_id}
                  className={`
                    group relative bg-gradient-to-br ${accent} to-base-100
                    rounded-3xl border border-base-300 shadow-md
                    hover:shadow-xl hover:-translate-y-1 hover:border-primary/40
                    transition-all duration-300 overflow-hidden
                  `}
                >
                  {/* Decorative corner circle */}
                  <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300" />

                  <div className="relative p-6 flex flex-col h-full">
                    {/* TOP ROW */}
                    <div className="flex justify-between items-start mb-5">
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-xl font-black text-primary shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {ws.workspace_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Permission badge */}
                      <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-base-200 border border-base-300 ${perm.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${perm.dot} animate-pulse`}></span>
                        {perm.label}
                      </span>
                    </div>

                    {/* NAME & DESC */}
                    <div className="flex-1 mb-6">
                      <h2 className="text-xl font-black tracking-tight leading-tight mb-2 truncate group-hover:text-primary transition-colors">
                        {ws.workspace_name}
                      </h2>
                      <p className="text-xs opacity-50 leading-relaxed line-clamp-2">
                        {ws.workspace_description || "No description provided for this workspace."}
                      </p>
                    </div>

                    {/* ID CHIP */}
                    <div className="font-mono text-[9px] opacity-30 font-bold tracking-widest mb-4">
                      WS-{String(ws.workspace_id).padStart(4, "0")}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2 pt-4 border-t border-base-300/60">
                      <button
                        onClick={() => openModal(ws)}
                        className="btn btn-ghost btn-sm rounded-xl flex-1 font-bold text-xs hover:bg-base-300"
                      >
                        Details
                      </button>
                      <Link
                        href={`/workspaces/${ws.workspace_id}/dashboard`}
                        className="btn btn-primary btn-sm rounded-xl flex-1 font-bold text-xs shadow-sm shadow-primary/20"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────── */}
      {modalOpen && selectedWs && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-150 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal panel */}
          <div className="fixed inset-0 z-150 flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]">

              {/* Header strip */}
              <div className="relative bg-primary px-8 pt-8 pb-10 text-primary-content overflow-hidden">
                {/* BG decoration */}
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5"></div>
                <div className="absolute top-4 right-4">
                  <button
                    onClick={closeModal}
                    className="btn btn-circle btn-xs btn-ghost text-primary-content/70 hover:text-primary-content hover:bg-white/20"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
                    {selectedWs.workspace_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase opacity-60 mb-0.5">Workspace</p>
                    <h3 className="text-2xl font-black tracking-tight leading-none">{selectedWs.workspace_name}</h3>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-white/20`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                  {selectedWs.permission}
                </span>
              </div>

              {/* Body */}
              <div className="px-8 py-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Description</p>
                <p className="text-sm text-base-content/70 leading-relaxed mb-6">
                  {selectedWs.workspace_description || "No description has been recorded for this workspace."}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-base-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">ID</p>
                    <p className="text-xl font-black font-mono text-primary">
                      #{String(selectedWs.workspace_id).padStart(4, "0")}
                    </p>
                  </div>
                  <div className="bg-base-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Access</p>
                    <p className={`text-xl font-black capitalize ${getPermConfig(selectedWs.permission).color}`}>
                      {selectedWs.permission}
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/workspaces/${selectedWs.workspace_id}/dashboard`}
                    className="btn btn-primary flex-1 rounded-2xl font-black"
                  >
                    Enter Dashboard
                  </Link>
                  <button className="btn btn-ghost flex-1 rounded-2xl font-black border border-base-300">
                    Edit Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}