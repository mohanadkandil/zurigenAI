import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FHIBE — VLM Bias Evaluation",
  description: "Fairness in Human-Image Bias Evaluation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" className="nav-logo">
            <div className="nav-icon">F</div>
            <div>
              <div className="nav-title">FHIBE Dashboard</div>
              <div className="nav-sub">Fairness in Human-Image Bias Evaluation</div>
            </div>
          </Link>
          <div className="nav-links">
            <Link href="/" className="nav-link">Verdict</Link>
            <Link href="/evidence" className="nav-link">Evidence</Link>
            <Link href="/hunt" className="nav-link">Hunt</Link>
            <Link href="/audit" className="nav-link">Audit</Link>
            <Link href="/submit" className="nav-link">Evaluate</Link>
          </div>
        </nav>
        {children}
        <footer>
          <p>FHIBE Bias Evaluation System · Dataset by <a href="#">Sony AI Ethics Lab</a> · Pipeline by <a href="#">ZurigenAI</a></p>
        </footer>
      </body>
    </html>
  );
}
