# 🌐 NetMonitor: Hybrid Network Monitoring System

NetMonitor adalah sistem monitoring perangkat jaringan berbasis web yang dibangun dengan **Next.js**. Sistem ini menggunakan metode **Hybrid Monitoring** (ICMP Ping & TCP Port Scanning) dengan arsitektur **Background Worker** yang efisien untuk memantau ketersediaan perangkat secara real-time tanpa membebani server.

## ✨ Fitur Utama

* **Hybrid Check:** Mendukung pengecekan via ICMP (Ping) dan spesifik TCP Port (untuk perangkat yang memblokir ICMP).
* **High Efficiency:** Menggunakan *Background Worker* dan *Global Cache* sehingga ribuan request dari user tidak membebani performa jaringan server.
* **Real-time Dashboard:** Tampilan modern dengan mode gelap (Dark Mode) menggunakan Tailwind CSS dan update otomatis via **SWR**.
* **Interactive Topology:** Visualisasi peta jaringan menggunakan **React Flow** yang dapat digeser (drag-and-drop) dan posisinya tersimpan di browser.
* **High Precision Latency:** Pengukuran waktu respon menggunakan `process.hrtime()` untuk akurasi hingga sub-milidetik.

## 🏗️ Arsitektur Sistem

Sistem ini bekerja dengan memisahkan proses pengecekan dari proses penampilan data:
1.  **Worker (Server-side):** Berjalan di latar belakang setiap 10 detik untuk memperbarui status IP.
2.  **Cache:** Hasil pengecekan disimpan dalam `Map` global di memori server.
3.  **API Route:** Menyediakan data dari cache secara instan kepada klien.
4.  **Client (SWR):** Melakukan polling ke API setiap 5 detik hanya saat tab browser aktif.

## 🚀 Teknologi yang Digunakan

* **Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Monitoring:** [Node.js Net Module](https://nodejs.org/api/net.html) & [Ping](https://www.npmjs.com/package/ping)
* **Data Fetching:** [SWR](https://swr.vercel.app/)
* **Topology UI:** [React Flow](https://reactflow.dev/)

## 🛠️ Cara Instalasi

1.  **Clone repositori:**
    ```bash
    git clone https://github.com/dedybayu/net-monitor.git
    cd net-monitor
    ```

2.  **Instal dependensi:**
    ```bash
    npm install
    ```

3.  **Jalankan aplikasi dalam mode pengembangan:**
    ```bash
    npm run dev
    ```

4.  **Buka di browser:**
    Akses `http://localhost:3000` untuk Dashboard atau `http://localhost:3000/topology` untuk Peta Jaringan.

