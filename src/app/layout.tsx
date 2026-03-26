import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopDesk AI — Your AI Receptionist",
  description: "Manage your AI phone receptionist for your auto shop.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
