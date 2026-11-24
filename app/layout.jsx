import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";
const body = Inter({ subsets: ["latin"], variable: "--f-body" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--f-display" });
export const metadata = {
  title: "REHATARA",
  description: "Rehat Terarah: sistem manajemen cuti karyawan",
  icons: {
    icon: "/images/icon.png",
    apple: "/images/apple-icon.png",
  },
};
export default function RootLayout({ children }) {
  return (<html lang="id"><body className={`${body.variable} ${display.variable} font-sans`}>{children}</body></html>);
}
