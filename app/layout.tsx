import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./_components/register-service-worker";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "VEKTOR · Radar Hama Tanaman",
  description: "Pantau dan laporkan kondisi tanaman padi di Karawang, termasuk saat koneksi terbatas.",
  appleWebApp: { title: "VEKTOR", statusBarStyle: "default", capable: true },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#143b2c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="id" className={geist.variable}><body>{children}<RegisterServiceWorker /></body></html>;
}
