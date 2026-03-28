import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Import Provider yang sudah kita buat sebelumnya
import NextAuthProvider from "@/src/components/NextAuthProvider"; 
import Navbar from "@/src/components/landing/Navbar";
import Footer from "@/src/components/landing/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Net Monitor",
  description: "Pantau Jaringanmu dengan Mudah dan Cepat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        {/* 2. Bungkus semua komponen dengan NextAuthProvider */}
        <NextAuthProvider>
          <Navbar />

          <main className="flex-1 pt-16">
            {children}
          </main>

          <Footer />
        </NextAuthProvider>
      </body>
    </html>
  );
}