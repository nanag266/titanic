import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Titanic City Ventures | Order Online in Accra",
  description: "Titanic City Ventures online menu, Accra delivery and secure Paystack checkout."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
