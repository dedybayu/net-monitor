// src/types/proxmox/resources.ts

export interface ProxmoxResource {
  // Identitas Utama
  id: string;
  type: 'qemu' | 'lxc' | 'storage' | 'node' | 'sdn';
  node: string;
  status: string;

  // Identitas Opsional (Tergantung tipe)
  vmid?: number;          // Ada di qemu, lxc
  name?: string;          // Ada di qemu, lxc, node
  storage?: string;       // Ada di storage
  sdn?: string;           // Ada di sdn
  plugintype?: string;    // Ada di storage
  
  // Metrik Resource (Hanya ada jika status online/running)
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;

  // Metrik Network & Disk I/O (Spesifik qemu/lxc)
  netin?: number;
  netout?: number;
  diskread?: number;
  diskwrite?: number;

  // Flags Lainnya
  template?: number;      // 0 atau 1
  shared?: number;        // Untuk storage
  content?: string;       // Untuk storage (iso, images, dll)
  level?: string;         // Untuk node
  "cgroup-mode"?: number; // Untuk node
}

export interface ProxmoxTask {
    upid: string;
    node: string;
    type: string;
    user: string;
    status: string;
    starttime: number;
    endtime?: number;
    id?: string;
    saved?: string;
}