// app/landing/page.tsx
'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30">
      
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12 border-b border-gray-900 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black text-xl">N</div>
          <span className="text-xl font-black tracking-tighter text-white">NETMONITOR</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition">Fitur</a>
          <a href="#topology" className="hover:text-white transition">Topologi</a>
          <a href="#pricing" className="hover:text-white transition">Harga</a>
        </div>
        <Link 
          href="/login" 
          className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Masuk Sekarang
        </Link>
      </nav>

      {/* HERO SECTION */}
      <section className="relative px-6 pt-20 pb-32 md:pt-32 md:pb-52 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-6">
            Monitoring Jaringan Masa Depan
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
            Pantau Jaringan Anda <br /> <span className="text-emerald-500 italic">Tanpa Henti.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Sistem monitoring hybrid pertama yang menggabungkan ICMP Ping, TCP Port Scan, dan Visualisasi Topologi dalam satu dashboard yang sangat ringan.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-emerald-500/20">
              Mulai Gratis
            </Link>
            <Link href="#features" className="w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-white border border-gray-800 px-10 py-4 rounded-2xl font-bold text-lg transition-all">
              Pelajari Fitur
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="px-6 py-24 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-emerald-500/50 transition-all group">
              <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">⚡</div>
              <h3 className="text-xl font-bold text-white mb-3">Ultra Fast Monitoring</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Pengecekan setiap detik dengan teknologi background worker yang tidak membebani server Anda.</p>
            </div>
            <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-emerald-500/50 transition-all group">
              <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">🔌</div>
              <h3 className="text-xl font-bold text-white mb-3">Hybrid Check</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Gunakan ICMP Ping atau TCP Port Scanning untuk perangkat yang berada di balik firewall ketat.</p>
            </div>
            <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-emerald-500/50 transition-all group">
              <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">🗺️</div>
              <h3 className="text-xl font-bold text-white mb-3">Visual Topology</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Visualisasikan hubungan antar perangkat dengan garis flow kabel yang interaktif dan dapat disimpan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-gray-900 text-center text-gray-600 text-sm">
        <p>&copy; 2026 NetMonitor System. Built with Next.js & Tailwind CSS.</p>
      </footer>
    </div>
  );
}