import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Personal Health OS",
  description: "James-first body and diet operating system."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
