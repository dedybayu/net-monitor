'use client';

import { useParams, useRouter } from 'next/navigation';

const devices = [
  {
    id: 'mikrotik',
    name: 'MikroTik',
    subtitle: 'CCR / RouterOS',
    description:
      'Monitor traffic jaringan, CPU, dan memori perangkat MikroTik secara real-time via SNMP.',
    badge: 'RouterOS',
    accent: 'from-info/8',
    iconBg: 'bg-info/10 border-info/20 text-info',
    badgeClass: 'badge-info badge-outline',
    dotClass: 'bg-info',
    btnClass: 'btn-info',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <line x1="15" y1="9.5" x2="19" y2="9.5" />
        <line x1="15" y1="12" x2="19" y2="12" />
        <line x1="15" y1="14.5" x2="19" y2="14.5" />
      </svg>
    ),
    stats: [
      { label: 'CPU', value: 'Real-time' },
      { label: 'Memory', value: 'Real-time' },
      { label: 'Interface', value: 'ether6 / 7' },
    ],
  },
  {
    id: 'ruijie',
    name: 'Ruijie',
    subtitle: 'Managed Switch / AP',
    description:
      'Pantau penggunaan bandwidth, beban CPU, dan status interface switch Ruijie via SNMP.',
    badge: 'RGOS',
    accent: 'from-secondary/8',
    iconBg: 'bg-secondary/10 border-secondary/20 text-secondary',
    badgeClass: 'badge-secondary badge-outline',
    dotClass: 'bg-secondary',
    btnClass: 'btn-secondary',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="6" rx="2" />
        <rect x="2" y="14" width="20" height="6" rx="2" />
        <circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="6" cy="17" r="1.2" fill="currentColor" stroke="none" />
        <line x1="10" y1="6" x2="18" y2="6" />
        <line x1="10" y1="8" x2="15" y2="8" />
        <line x1="10" y1="16" x2="18" y2="16" />
        <line x1="10" y1="18" x2="15" y2="18" />
      </svg>
    ),
    stats: [
      { label: 'CPU', value: 'Real-time' },
      { label: 'Memory', value: 'Real-time' },
      { label: 'Traffic', value: 'Rx / Tx Mbps' },
    ],
  },
];

export default function SNMPPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspace_id as string;

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans pt-6 lg:pl-72">
      <div className="p-6 md:p-10 max-w-4xl mx-auto">

        {/* ── PAGE HEADER ── */}
        <div className="mb-10">
          <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 mb-2 flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-primary" />
            Network Monitoring
          </p>
          <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content">
            SNMP<span className="text-primary"> Monitor</span>
          </h1>
          <p className="text-sm opacity-50 mt-2 font-medium">
            Pilih perangkat yang ingin dipantau menggunakan protokol SNMP.
          </p>
        </div>

        {/* ── DEVICE CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {devices.map((device, i) => (
            <div
              key={device.id}
              className={`
                group relative bg-gradient-to-br ${device.accent} to-base-100
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
                  <div
                    className={`h-12 w-12 rounded-2xl border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300 ${device.iconBg}`}
                  >
                    {device.icon}
                  </div>
                  <div className={`badge ${device.badgeClass} font-black text-[9px] tracking-widest`}>
                    {device.badge}
                  </div>
                </div>

                {/* NAME & DESC */}
                <div className="flex-1 mb-4">
                  <h2 className="text-xl font-black tracking-tight leading-tight mb-1 group-hover:text-primary transition-colors">
                    {device.name}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">
                    {device.subtitle}
                  </p>
                  <p className="text-xs opacity-50 leading-relaxed">
                    {device.description}
                  </p>
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {device.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-base-200 rounded-2xl p-2.5 text-center border border-base-300"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                        {stat.label}
                      </p>
                      <p className="text-[10px] font-black opacity-70">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-between pt-4 border-t border-base-300/60">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${device.dotClass} animate-pulse`} />
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                      SNMP Ready
                    </span>
                  </div>
                  <button
                    id={`snmp-open-${device.id}`}
                    onClick={() => router.push(`/workspaces/${workspaceId}/snmp/${device.id}`)}
                    className={`btn ${device.btnClass} btn-sm rounded-xl font-bold text-xs shadow-sm`}
                  >
                    Buka Dashboard →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── INFO BANNER ── */}
        <div className="alert border border-base-300 bg-base-100 rounded-3xl shadow-sm">
          <svg
            className="w-5 h-5 text-warning shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-warning mb-0.5">
              Konfigurasi SNMP
            </p>
            <p className="text-xs opacity-60 leading-relaxed">
              Pastikan SNMP v2c sudah aktif pada perangkat target dan{' '}
              <em>community string</em> sudah dikonfigurasi di file{' '}
              <code className="bg-base-200 px-1.5 py-0.5 rounded font-mono">.env</code>{' '}
              sebelum memulai monitoring.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
