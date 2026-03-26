import Link from "next/link"

export default function Home() {
  return (
    <main>
      {/* HERO SECTION */}
      <section id="home" className="hero min-h-[90vh] bg-base-100 relative overflow-hidden">
        {/* Background Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10" />

        <div className="hero-content text-center relative z-10">
          <div className="max-w-3xl">
            <div className="badge badge-outline badge-secondary mb-4 p-4 uppercase tracking-widest font-bold">
              Hybrid Monitoring System
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-base-content leading-tight tracking-tighter">
              Pantau Jaringan,<br className="hidden md:block" />
              Tanpa Rasa Khawatir
            </h2>

            <p className="text-lg text-base-content/70 mb-8 max-w-2xl mx-auto">
              NetMonitor membantu administrator IT mengawasi perangkat jaringan,
              menganalisis latensi, dan memvisualisasikan topologi dalam satu platform yang ringan dan cepat.
            </p>

            <div className="flex justify-center gap-4">
              <Link href="/login">
                <button className="btn btn-primary btn-lg px-8 shadow-lg shadow-primary/20">
                  Mulai Sekarang
                </button>
              </Link>
              <Link href="/topology">
                <button className="btn btn-outline btn-lg px-8">
                  Lihat Topologi
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR UTAMA */}
      <section className="bg-base-200" id="features">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Fitur Andalan Monitoring
            </h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Dirancang untuk memberikan visibilitas total terhadap infrastruktur jaringan Anda
              dengan beban server yang minimal.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Feature
              icon="⚡"
              title="Hybrid Monitoring"
              desc="Gunakan ICMP Ping atau TCP Port Scan untuk perangkat di balik firewall."
            />
            <Feature
              icon="🗺️"
              title="Visual Topology"
              desc="Petakan hubungan antar perangkat dengan drag-and-drop topologi interaktif."
            />
            <Feature
              icon="⏱️"
              title="Real-time Analytics"
              desc="Update status dan latensi setiap detik tanpa perlu refresh halaman."
            />
            <Feature
              icon="📱"
              title="Agent Monitoring"
              desc="Pantau jaringan lokal tanpa port forwarding menggunakan agent ringan."
            />
          </div>
        </div>
      </section>

      {/* TENTANG SISTEM */}
      <section className="bg-base-100" id="about">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">
                Mengapa Memilih NetMonitor?
              </h2>

              <p className="text-base-content/70 leading-relaxed mb-6">
                Banyak sistem monitoring yang terlalu kompleks dan berat. NetMonitor hadir
                dengan filosofi <strong>Efficiency First</strong> menggunakan Background Worker
                dan Global Cache untuk memastikan performa tetap stabil.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="badge badge-primary badge-sm mt-1"></div>
                  <p className="text-sm font-medium">Notifikasi instan via WhatsApp & Telegram (Coming Soon)</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="badge badge-primary badge-sm mt-1"></div>
                  <p className="text-sm font-medium">Akurasi latensi hingga sub-milidetik (process.hrtime)</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="badge badge-primary badge-sm mt-1"></div>
                  <p className="text-sm font-medium">UI modern dengan mode gelap otomatis</p>
                </div>
              </div>

              {/* SOCIAL MEDIA */}
              <div>
                <h3 className="font-semibold mb-4">Sosial Media</h3>

                <div className="flex gap-4">
                  <a
                    href="#"
                    className="btn btn-circle btn-outline hover:btn-primary transition-all"
                  >
                    {/* Instagram */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="2" />
                      <circle cx="12" cy="12" r="4" strokeWidth="2" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                  </a>

                  <a
                    href="#"
                    className="btn btn-circle btn-outline hover:btn-primary transition-all"
                  >
                    {/* Twitter/X */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2H21l-6.56 7.49L22 22h-6.828l-5.35-7.003L3.9 22H1.14l7.02-8.012L2 2h6.92l4.84 6.354L18.244 2z" />
                    </svg>
                  </a>

                  <a
                    href="#"
                    className="btn btn-circle btn-outline hover:btn-primary transition-all"
                  >
                    {/* LinkedIn */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1s2.49 1.12 2.49 2.5zM0 8h5v16H0V8zm7.5 0h4.8v2.2h.07c.67-1.27 2.3-2.6 4.73-2.6 5.06 0 6 3.33 6 7.65V24h-5v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.07V24h-5V8z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* CARD INFO MISI */}
            <div className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body">
                <h3 className="card-title text-xl font-bold mb-4">
                  Fokus Kami
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-primary">Simpel & Cepat</h4>
                    <p className="text-sm text-base-content/70">Dashboard yang bersih tanpa grafik yang membingungkan.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Keamanan Data</h4>
                    <p className="text-sm text-base-content/70">Semua data monitoring dienkripsi dan diproteksi dengan sistem autentikasi.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Skalabilitas</h4>
                    <p className="text-sm text-base-content/70">Mampu menangani ratusan node IP dengan penggunaan RAM yang sangat rendah.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Sub-komponen Fitur
function Feature({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group">
      <div className="card-body">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="card-title text-lg font-bold">
          {title}
        </h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  )
}

// Sub-komponen Sosmed
function SocialIcon({ platform }: { platform: string }) {
  return (
    <a href="#" className="btn btn-sm btn-circle btn-ghost border border-base-300">
      <span className="text-[10px]">{platform.charAt(0)}</span>
    </a>
  )
}