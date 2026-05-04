'use client';

import type { UserTrafficSummary } from '@/types/traffic';
import { formatBytes, APP_COLORS } from '@/types/traffic';

interface UserTableProps {
  users: UserTrafficSummary[];
  useBits: boolean;
}

export default function UserTable({ users, useBits }: UserTableProps) {
  const maxBytes = users.length > 0 ? users[0].totalBytes : 0;

  return (
    <div className="card bg-base-100 shadow-md border border-base-200/50 p-5" id="user-table">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-base-content">
            User Traffic Summary
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Bandwidth usage per source IP
          </p>
        </div>
        <div className="badge badge-ghost badge-sm font-mono">
          {users.length} users
        </div>
      </div>

      <div className="overflow-auto max-h-[400px] rounded-lg">
        <table className="table table-xs">
          <thead>
            <tr className="bg-base-300/80">
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">#</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Source IP</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Top App</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider">Flows</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider min-w-[200px]">Bandwidth</th>
              <th className="text-base-content/60 font-semibold text-[11px] uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, idx) => {
                const pct = maxBytes > 0 ? (user.totalBytes / maxBytes) * 100 : 0;
                const appColor = APP_COLORS[user.topApplication] || APP_COLORS['Other'];

                return (
                  <tr key={user.srcIp} className="hover:bg-base-content/5 transition-colors">
                    <td className="font-mono text-[11px] text-base-content/40">
                      {idx + 1}
                    </td>
                    <td className="font-mono text-[12px] font-semibold">
                      {user.srcIp}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: appColor }}
                        />
                        <span className="text-xs font-medium" style={{ color: appColor }}>
                          {user.topApplication}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-base-content/60">
                      {user.flowCount.toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-base-300 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${appColor}88, ${appColor})`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-base-content/50 w-10 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-right font-semibold">
                      {formatBytes(user.totalBytes, useBits)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-12 text-base-content/30">
                  <div className="loading loading-dots loading-md mb-2"></div>
                  <p className="text-sm">Waiting for user data...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
