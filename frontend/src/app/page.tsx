'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const POINTS = [
  { lat: 9.1, lng: 18.7, size: 0.6, hot: true },
  { lat: 30.0, lng: 31.2, size: 0.4, hot: true },
  { lat: -1.3, lng: 36.8, size: 0.35, hot: true },
  { lat: 6.5, lng: 3.4, size: 0.5, hot: true },
  { lat: 40.7, lng: -74.0, size: 0.28, hot: false },
  { lat: -23.5, lng: -46.6, size: 0.22, hot: false },
  { lat: 35.7, lng: 139.7, size: 0.32, hot: false },
  { lat: 28.6, lng: 77.2, size: 0.42, hot: false },
  { lat: 51.5, lng: -0.1, size: 0.3, hot: false },
  { lat: -33.9, lng: 151.2, size: 0.18, hot: false },
];

const ARCS = [
  { startLat: 51.5, startLng: -0.1, endLat: 9.1, endLng: 18.7 },
  { startLat: 35.7, startLng: 139.7, endLat: 6.5, endLng: 3.4 },
  { startLat: 40.7, startLng: -74.0, endLat: -1.3, endLng: 36.8 },
  { startLat: 28.6, startLng: 77.2, endLat: 30.0, endLng: 31.2 },
];

function Counter({ value, suffix = '', duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setCount(Math.round(eased * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function Reveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const from = direction === 'up' ? 'translateY(60px)' : direction === 'left' ? 'translateX(-60px)' : 'translateX(60px)';

  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translate(0)' : from,
      filter: vis ? 'blur(0)' : 'blur(8px)',
      transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, filter 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

export default function Home() {
  const [countries, setCountries] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const globeRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2/countries-50m.json')
      .then(r => r.json())
      .then(async (d) => {
        const topo = await import('topojson-client');
        setCountries((topo.feature(d, d.objects.countries) as any).features);
      }).catch(() => {});
  }, []);

  const configGlobe = useCallback(() => {
    if (!globeRef.current) return;
    const g = globeRef.current;
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.12;
    c.enableZoom = false;
    c.enablePan = false;
    c.enableRotate = false;
    g.pointOfView({ lat: 20, lng: 10, altitude: 1.6 }, 0);
    const m = g.globeMaterial();
    m.color.set('#151515');
    m.opacity = 0.95;
    m.transparent = true;
  }, []);

  useEffect(() => {
    if (mounted && countries.length) {
      const t = setTimeout(configGlobe, 500);
      return () => clearTimeout(t);
    }
  }, [mounted, countries, configGlobe]);

  const pts = POINTS.map(p => ({ ...p, color: p.hot ? '#E63946' : 'rgba(240,236,228,0.4)', altitude: 0.012 }));
  const rings = POINTS.filter(p => p.hot).map(p => ({
    lat: p.lat, lng: p.lng, maxR: 5, propagationSpeed: 0.5, repeatPeriod: 2800, color: () => 'rgba(230,57,70,0.35)',
  }));

  return (
    <>
      <style jsx global>{`
        @keyframes heroIn {
          from { opacity:0; transform:scale(0.9); filter:blur(20px); }
          to { opacity:1; transform:scale(1); filter:blur(0); }
        }
        @keyframes titleWord {
          from { opacity:0; transform:translateY(80px) rotateX(40deg); filter:blur(10px); }
          to { opacity:1; transform:translateY(0) rotateX(0deg); filter:blur(0); }
        }
        @keyframes breathe {
          0%,100% { box-shadow:0 0 30px rgba(230,57,70,0.08); }
          50% { box-shadow:0 0 70px rgba(230,57,70,0.22); }
        }
        @keyframes subtlePulse {
          0%,100% { opacity:0.4; }
          50% { opacity:1; }
        }
        body { overflow-x:hidden; }
      `}</style>

      <main style={{ background: '#0A0A0A' }}>

        {/* ═══ GLOBE — fixed background, always visible ═══ */}
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 1,
          animation: 'heroIn 2.5s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {mounted && (
            <Globe
              ref={globeRef}
              width={Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.85 : 900, 1000)}
              height={Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.85 : 900, 1000)}
              backgroundColor="rgba(0,0,0,0)"
              showGlobe={true}
              showAtmosphere={true}
              atmosphereColor="#E63946"
              atmosphereAltitude={0.2}
              showGraticules={false}
              globeImageUrl=""
              polygonsData={countries}
              polygonCapColor={() => 'rgba(35,33,30,0.92)'}
              polygonSideColor={() => 'rgba(35,33,30,0.5)'}
              polygonStrokeColor={() => 'rgba(200,180,160,0.06)'}
              polygonAltitude={0.005}
              pointsData={pts}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="altitude"
              pointRadius="size"
              pointColor="color"
              pointsMerge={false}
              arcsData={ARCS}
              arcStartLat="startLat"
              arcStartLng="startLng"
              arcEndLat="endLat"
              arcEndLng="endLng"
              arcColor={() => ['rgba(230,57,70,0.7)', 'rgba(230,57,70,0.0)']}
              arcDashLength={0.5}
              arcDashGap={0.15}
              arcDashAnimateTime={3000}
              arcStroke={0.35}
              ringsData={rings}
              ringLat="lat"
              ringLng="lng"
              ringMaxRadius="maxR"
              ringPropagationSpeed="propagationSpeed"
              ringRepeatPeriod="repeatPeriod"
              ringColor="color"
            />
          )}
        </div>

        {/* ═══ SCROLLING CONTENT over globe ═══ */}
        <div style={{ position: 'relative', zIndex: 10 }}>

          {/* ── 1. Title ── */}
          <section style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            perspective: '800px',
          }}>
            <div style={{
              fontFamily: 'Inter', fontSize: '0.55rem', fontWeight: 600,
              letterSpacing: 4, color: '#E63946', textTransform: 'uppercase',
              marginBottom: '2.5rem',
              animation: 'titleWord 1s cubic-bezier(0.16,1,0.3,1) 0.8s both',
            }}>
              An Investigation into AI Vision Bias
            </div>
            <h1 style={{ margin: 0, perspective: '600px' }}>
              <span style={{
                display: 'block',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(5rem, 14vw, 12rem)',
                fontWeight: 700, lineHeight: 0.85, letterSpacing: '-6px',
                color: 'rgba(240,236,228,0.95)',
                textShadow: '0 4px 80px rgba(0,0,0,0.9)',
                animation: 'titleWord 1.2s cubic-bezier(0.16,1,0.3,1) 0.2s both',
              }}>pixel</span>
              <span style={{
                display: 'block',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(5rem, 14vw, 12rem)',
                fontWeight: 700, lineHeight: 0.85, letterSpacing: '-6px',
                color: '#E63946', fontStyle: 'italic',
                textShadow: '0 4px 80px rgba(230,57,70,0.3)',
                animation: 'titleWord 1.2s cubic-bezier(0.16,1,0.3,1) 0.5s both',
              }}>Prejudice</span>
            </h1>
            <div style={{
              marginTop: '4rem',
              animation: 'titleWord 1s cubic-bezier(0.16,1,0.3,1) 1.5s both',
            }}>
              <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
                <rect x="6" y="0" width="8" height="16" rx="4" stroke="rgba(90,85,72,0.4)" strokeWidth="1.5"/>
                <circle cx="10" cy="7" r="2" fill="#E63946">
                  <animate attributeName="cy" values="6;11;6" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
                </circle>
              </svg>
            </div>
          </section>

          {/* ── 2. The Problem ── */}
          <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            padding: '0 clamp(3rem, 8vw, 10rem)',
          }}>
            <div>
              <Reveal delay={0}>
                <div style={{
                  fontFamily: 'Inter', fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: 3, color: '#E63946', textTransform: 'uppercase',
                  marginBottom: '2rem',
                }}>The Problem</div>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700,
                  color: '#F0ECE4', lineHeight: 1.15, letterSpacing: '-2px',
                  maxWidth: 700, margin: 0,
                }}>
                  AI models don't just see faces.
                </h2>
              </Reveal>
              <Reveal delay={0.3}>
                <h2 style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700,
                  color: '#E63946', fontStyle: 'italic',
                  lineHeight: 1.15, letterSpacing: '-2px',
                  margin: '0.25rem 0 0',
                }}>
                  They judge them.
                </h2>
              </Reveal>
              <Reveal delay={0.5}>
                <p style={{
                  fontFamily: 'Inter', fontSize: '1rem', color: '#5A5548',
                  lineHeight: 1.8, maxWidth: 480, marginTop: '2.5rem',
                }}>
                  We tested three leading vision-language models on 10,247 faces
                  from 47 countries across all 6 Fitzpatrick skin types. The pattern was undeniable.
                </p>
              </Reveal>
            </div>
          </section>

          {/* ── 3. The Number ── */}
          <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
          }}>
            <Reveal>
              <div style={{
                fontFamily: "'Playfair Display'",
                fontSize: 'clamp(7rem, 18vw, 14rem)',
                fontWeight: 700, color: '#E63946',
                letterSpacing: '-8px', lineHeight: 0.85,
                textShadow: '0 0 120px rgba(230,57,70,0.15)',
              }}>
                −<Counter value={27} suffix="%" duration={1500} />
              </div>
              <div style={{
                fontFamily: "'Playfair Display'", fontStyle: 'italic',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                color: '#9A9080', marginTop: '2rem', lineHeight: 1.5,
              }}>
                trust gap between the lightest<br/>and darkest skin tones
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono'", fontSize: '0.7rem',
                color: '#E63946', marginTop: '1.5rem', letterSpacing: 1,
                animation: 'subtlePulse 3s ease infinite',
              }}>
                p &lt; 0.001
              </div>
            </Reveal>
          </section>

          {/* ── 4. How It Works ── */}
          <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            padding: '0 clamp(3rem, 8vw, 10rem)',
            justifyContent: 'flex-end',
          }}>
            <div style={{ maxWidth: 520 }}>
              <Reveal direction="right">
                <div style={{
                  fontFamily: 'Inter', fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: 3, color: '#E63946', textTransform: 'uppercase',
                  marginBottom: '2rem', textAlign: 'right',
                }}>How pixelPrejudice Works</div>
              </Reveal>
              {[
                { n: '01', t: 'Collect', d: '10,247 faces from FairFace — 47 countries, 6 Fitzpatrick skin types.' },
                { n: '02', t: 'Evaluate', d: 'Each face judged by Qwen3-30B, Qwen2.5-7B, and Phi-3.5-Vision via our agentic pipeline.' },
                { n: '03', t: 'Analyze', d: 'LLM-as-Judge scoring, statistical correlation analysis, automated bias reporting.' },
                { n: '04', t: 'Expose', d: 'Interactive evidence room — 3D globe, prompt hunting, real-time photo auditing.' },
              ].map((step, i) => (
                <Reveal key={step.n} delay={0.15 * (i + 1)} direction="right">
                  <div style={{ textAlign: 'right', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '0.65rem', color: '#E63946' }}>{step.n}</span>
                      <span style={{ fontFamily: "'Playfair Display'", fontSize: '1.3rem', fontWeight: 700, color: '#F0ECE4' }}>{step.t}</span>
                    </div>
                    <p style={{ fontFamily: 'Inter', fontSize: '0.85rem', color: '#5A5548', lineHeight: 1.7, margin: 0 }}>{step.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── 5. The Models ── */}
          <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
            padding: '0 3rem',
          }}>
            <div>
              <Reveal>
                <div style={{
                  fontFamily: 'Inter', fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: 3, color: '#E63946', textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                }}>The Verdict</div>
                <h2 style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700,
                  color: '#F0ECE4', letterSpacing: '-1px', marginBottom: '4rem',
                }}>
                  Three models. All biased. <span style={{ color: '#E63946', fontStyle: 'italic' }}>None innocent.</span>
                </h2>
              </Reveal>
              <div style={{ display: 'flex', gap: 'clamp(3rem, 6vw, 6rem)', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { name: 'Phi-3.5', score: 0.793, corr: '-0.207', worst: true },
                  { name: 'Qwen2.5-7B', score: 0.894, corr: '-0.106', worst: false },
                  { name: 'Qwen3-30B', score: 0.911, corr: '-0.089', worst: false },
                ].map((m, i) => (
                  <Reveal key={m.name} delay={0.2 * i}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 700,
                        color: m.worst ? '#E63946' : '#F0ECE4', letterSpacing: '-2px',
                        textShadow: m.worst ? '0 0 60px rgba(230,57,70,0.2)' : 'none',
                      }}>
                        <Counter value={Math.round(m.score * 1000)} suffix="" duration={1800} />
                      </div>
                      <div style={{ fontFamily: 'Inter', fontSize: '0.55rem', color: '#5A5548', letterSpacing: 1, textTransform: 'uppercase' }}>fairness × 1000</div>
                      <div style={{ fontFamily: "'Playfair Display'", fontSize: '1.1rem', fontWeight: 700, color: '#F0ECE4', marginTop: '0.75rem' }}>{m.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '0.75rem', color: '#E63946', marginTop: '0.25rem' }}>{m.corr}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ── 6. CTA ── */}
          <section style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}>
            <Reveal>
              <div style={{
                fontFamily: "'Playfair Display'", fontStyle: 'italic',
                fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                color: '#9A9080', lineHeight: 1.7, maxWidth: 480, marginBottom: '3rem',
              }}>
                "A 2-point gap on a 10-point scale is not noise.
                It is prejudice, encoded in weights."
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <Link href="/evidence" style={{
                display: 'inline-block',
                background: '#E63946', color: '#F0ECE4',
                padding: '1rem 3.5rem', borderRadius: '8px',
                fontFamily: 'Inter', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.04em',
                animation: 'breathe 3s ease infinite',
              }}>
                Enter the Investigation
              </Link>
            </Reveal>
            <Reveal delay={0.4}>
              <div style={{ display: 'flex', gap: '3rem', marginTop: '3rem' }}>
                {[
                  { href: '/evidence', l: 'Evidence' },
                  { href: '/hunt', l: 'Hunt' },
                  { href: '/audit', l: 'Audit' },
                ].map(link => (
                  <Link key={link.href} href={link.href} style={{
                    fontFamily: 'Inter', fontSize: '0.75rem', color: '#5A5548',
                    textDecoration: 'none', letterSpacing: 1,
                    borderBottom: '1px solid #222', paddingBottom: 4,
                  }}>
                    {link.l}
                  </Link>
                ))}
              </div>
            </Reveal>
            <div style={{ fontFamily: 'Inter', fontSize: '0.5rem', color: '#333', marginTop: '5rem', letterSpacing: 1 }}>
              pixelPrejudice · TUM × Sony AI Hackathon 2026
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
