import type { ReactNode } from "react";
import "@fontsource-variable/public-sans";
import "./globals.css";

export const metadata = {
  title: "Ownify",
  description: "Verified AI agents you own.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
