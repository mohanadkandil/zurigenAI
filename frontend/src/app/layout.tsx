import type { Metadata } from "next";
import "./globals.css";
import NavFooter from "./nav-footer";

export const metadata: Metadata = {
  title: "pixelPrejudice — Auditing Visual AI Bias",
  description: "Three models. Ten thousand faces. A pattern of prejudice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavFooter>{children}</NavFooter>
      </body>
    </html>
  );
}
