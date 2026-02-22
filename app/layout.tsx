import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book by Book",
  description: "A social reading app with clubs, shelves, and reviews.",
};

export default function RootLayout({ children }: Props.Layout) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
