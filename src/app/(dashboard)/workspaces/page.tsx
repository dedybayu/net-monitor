"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Owner {
  name: string | null;
  email: string;
}

interface Workspace {
  workspace_id: number;
  workspace_name: string;
  workspace_description: string;
  permission: string;
  created_at?: string;
  owner?: Owner; // hanya ada di shared workspaces
}

interface WorkspaceData {
  owned: Workspace[];
  shared: Workspace[];
}

const PERMISSION_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  admin:  { label: "Admin",  color: "text-error",   dot: "bg-error" },
  owner:  { label: "Owner",  color: "text-warning",  dot: "bg-warning" },
  editor: { label: "Editor", color: "text-primary",  dot: "bg-primary" },
  viewer: { label: "Viewer", color: "text-success",  dot: "bg-success" },
};

const getPermConfig = (p: string) =>
  PERMISSION_CONFIG[p?.toLowerCase()] ?? { label: p, color: "text-base-content/50", dot: "bg-base-content/30" };

const CARD_ACCENTS = [
  "from-primary/8", "from-secondary/8", "from-accent/8",
  "from-info/8", "from-success/8", "from-warning/8",
];

// ── Reusable workspace card ───────────────────────────────────────────────────
function WorkspaceCard({
  ws,
  index,
  onDetail,
  sharedBy,
}: {
  ws: Workspace;
  index: number;
  onDetail: (ws: Workspace) => void;
  sharedBy?: string; // nama/email pembagi
}) {
  const perm   = getPermConfig(ws.permission);
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <div
      className={`
        group relative bg-gradient-to-br ${accent} to-base-100
        rounded-3xl border border-base-300 shadow-md
        hover:shadow-xl hover:-translate-y-1 hover:border-primary/40
        transition-all duration-300 overflow-hidden
      `}
    >
      {/* Decorative circle */}
      <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300" />

      <div className="relative p-6 flex flex-col h-full">
        {/* TOP ROW */}
        <div className="flex justify-between items-start mb-5">
          <div className="h-12 w-12 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-xl font-black text-primary shadow-inner group-hover:scale-110 transition-transform duration-300">
            {ws.workspace_name.charAt(0).toUpperCase()}
          </div>
          <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-base-200 border border-base-300 ${perm.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${perm.dot} animate-pulse`}></span>
            {perm.label}
          </span>
        </div>

        {/* NAME & DESC */}
        <div className="flex-1 mb-4">
          <h2 className="text-xl font-black tracking-tight leading-tight mb-2 truncate group-hover:text-primary transition-colors">
            {ws.workspace_name}
          </h2>
          <p className="text-xs opacity-50 leading-relaxed line-clamp-2">
            {ws.workspace_description || "No description provided for this workspace."}
          </p>
        </div>

        {/* "Shared by" badge — hanya muncul di shared section */}
        {sharedBy && (
          <div className="flex items-center gap-1.5 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] opacity-40 font-semibold truncate">
              Shared by <span className="font-black">{sharedBy}</span>
            </span>
          </div>
        )}

        {/* ID CHIP */}
        <div className="font-mono text-[9px] opacity-30 font-bold tracking-widest mb-4">
          WS-{String(ws.workspace_id).padStart(4, "0")}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 pt-4 border-t border-base-300/60">
          <button
            onClick={() => onDetail(ws)}
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
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, eyebrow }: { icon: string; title: string; count: number; eyebrow: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-1.5 flex items-center gap-2">
          <span className="inline-block h-px w-5 bg-primary"></span>
          {eyebrow}
        </p>
        <h2 className="text-3xl font-black tracking-tighter leading-none text-base-content flex items-center gap-3">
          <span>{icon}</span>
          {title}
        </h2>
      </div>
      <span className="text-xs font-black opacity-30 tabular-nums">
        {count} environment{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Empty card ────────────────────────────────────────────────────────────────
function EmptyCard({ message }: { message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center bg-base-100 rounded-3xl border-2 border-dashed border-base-300 py-16 px-10 text-center">
      <div className="text-5xl mb-4 opacity-20">⬡</div>
      <p className="text-sm opacity-40 font-semibold">{message}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const [data, setData]       = useState<WorkspaceData>({ owned: [], shared: [] });
  const [loading, setLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [activeTab, setActiveTab]   = useState<"owned" | "shared">("owned");

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((d: WorkspaceData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openModal  = (ws: Workspace) => { setSelectedWs(ws); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const totalCount = data.owned.length + data.shared.length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 pt-16 lg:pl-64 gap-5">
        <span className="loading loading-ring loading-lg text-primary"></span>
        <p className="text-xs font-black tracking-[0.3em] uppercase opacity-40 animate-pulse">
          Loading Workspaces
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 pt-16 lg:pl-64 font-sans">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">

        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-primary"></span>
              Network Environments
            </p>
            <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content">
              Work<span className="text-primary">spaces</span>
            </h1>
            <p className="text-sm opacity-50 mt-2 font-medium">
              {totalCount} environment{totalCount !== 1 ? "s" : ""} available
            </p>
          </div>

          <button className="btn btn-primary rounded-2xl gap-2 px-6 shadow-lg shadow-primary/20 font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        </div>

        {/* ── TAB SWITCHER ── */}
        <div className="flex gap-1 bg-base-100 p-1.5 rounded-2xl border border-base-300 w-fit mb-10 shadow-sm">
          {(["owned", "shared"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200
                ${activeTab === tab
                  ? "bg-primary text-primary-content shadow-md shadow-primary/30"
                  : "text-base-content/50 hover:text-base-content"}
              `}
            >
              {tab === "owned" ? "My Workspaces" : "Shared with Me"}
              <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-base-200"}`}>
                {tab === "owned" ? data.owned.length : data.shared.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── MY WORKSPACES ── */}
        {activeTab === "owned" && (
          <section>
            <SectionHeader
              icon="🏠"
              title="My Workspaces"
              count={data.owned.length}
              eyebrow="Owned by you"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {data.owned.length === 0
                ? <EmptyCard message="You haven't created any workspaces yet." />
                : data.owned.map((ws, i) => (
                    <WorkspaceCard key={ws.workspace_id} ws={ws} index={i} onDetail={openModal} />
                  ))}
            </div>
          </section>
        )}

        {/* ── SHARED WITH ME ── */}
        {activeTab === "shared" && (
          <section>
            <SectionHeader
              icon="🤝"
              title="Shared with Me"
              count={data.shared.length}
              eyebrow="Granted by others"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {data.shared.length === 0
                ? <EmptyCard message="No one has shared a workspace with you yet." />
                : data.shared.map((ws, i) => (
                    <WorkspaceCard
                      key={ws.workspace_id}
                      ws={ws}
                      index={i}
                      onDetail={openModal}
                      sharedBy={ws.owner?.name ?? ws.owner?.email}
                    />
                  ))}
            </div>
          </section>
        )}
      </div>

      {/* ── MODAL ── */}
      {modalOpen && selectedWs && (
        <>
          <div className="fixed inset-0 z-150 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-150 flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]">

              {/* Header strip */}
              <div className="relative bg-primary px-8 pt-8 pb-10 text-primary-content overflow-hidden">
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5"></div>
                <button onClick={closeModal} className="absolute top-4 right-4 btn btn-circle btn-xs btn-ghost text-primary-content/70 hover:text-primary-content hover:bg-white/20">
                  ✕
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
                    {selectedWs.workspace_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase opacity-60 mb-0.5">Workspace</p>
                    <h3 className="text-2xl font-black tracking-tight leading-none">{selectedWs.workspace_name}</h3>
                  </div>
                </div>
                {/* Shared-by info in modal */}
                {selectedWs.owner && (
                  <p className="text-[10px] opacity-60 mb-2">
                    Shared by <span className="font-black">{selectedWs.owner.name ?? selectedWs.owner.email}</span>
                  </p>
                )}
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-white/20">
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/workspaces/${selectedWs.workspace_id}/dashboard`} className="btn btn-primary flex-1 rounded-2xl font-black">
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