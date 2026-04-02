'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) return <>{children}</>;

  return (
    <>
      <nav>
        <Link href="/" className="nav-logo">
          <div className="nav-title">pixelPrejudice</div>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Verdict</Link>
          <Link href="/evidence" className="nav-link">Evidence</Link>
          <Link href="/hunt" className="nav-link">Hunt</Link>
          <Link href="/audit" className="nav-link">Audit</Link>
        </div>
      </nav>
      {children}
      <footer>
        <p>pixelPrejudice — Auditing visual AI bias · TUM × Sony AI Hackathon 2026</p>
      </footer>
    </>
  );
}
