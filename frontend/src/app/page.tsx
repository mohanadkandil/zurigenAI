"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "2px solid #1A1A1A",
          borderTopColor: "#E63946",
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  ),
});

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

export default function Home() {
  const [countries, setCountries] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const globeRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const globeWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const fallback = setTimeout(() => setGlobeReady(true), 4000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    fetch("https://unpkg.com/world-atlas@2/countries-50m.json")
      .then((r) => r.json())
      .then(async (d) => {
        const topo = await import("topojson-client");
        setCountries((topo.feature(d, d.objects.countries) as any).features);
      })
      .catch(() => setGlobeReady(true));
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
    m.color.set("#151515");
    m.opacity = 0.95;
    m.transparent = true;
    setTimeout(() => setGlobeReady(true), 500);
  }, []);

  useEffect(() => {
    if (mounted && countries.length) {
      const t = setTimeout(configGlobe, 400);
      return () => clearTimeout(t);
    }
  }, [mounted, countries, configGlobe]);

  // ═══ GSAP ANIMATIONS ═══
  useEffect(() => {
    if (!globeReady || !mainRef.current) return;

    const ctx = gsap.context(() => {
      // ── Hero entrance timeline ──
      const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
      heroTl
        .from(".hero-kicker", { y: 20, opacity: 0, duration: 0.8 }, 0.2)
        .from(
          ".hero-w1",
          {
            y: 120,
            opacity: 0,
            scale: 0.95,
            filter: "blur(15px)",
            duration: 1.4,
          },
          0.3,
        )
        .from(
          ".hero-w2",
          {
            y: 120,
            opacity: 0,
            scale: 0.95,
            filter: "blur(15px)",
            duration: 1.4,
          },
          0.5,
        )
        .from(".hero-bottom", { y: 20, opacity: 0, duration: 0.8 }, 1.2);

      // ── Globe parallax: scale down + fade as you scroll ──
      if (globeWrapRef.current) {
        gsap.to(globeWrapRef.current, {
          scale: 0.7,
          opacity: 0.3,
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: mainRef.current,
            start: "top top",
            end: "+=4000",
            scrub: 1.5,
          },
        });
      }

      // ── Section 2: Problem — pin and reveal words ──
      const problemSection = document.querySelector(".s-problem");
      if (problemSection) {
        const words = problemSection.querySelectorAll(".word");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: problemSection,
            start: "top top",
            end: "+=150%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
        tl.from(words, {
          y: 80,
          opacity: 0,
          filter: "blur(12px)",
          stagger: 0.08,
          duration: 0.5,
          ease: "power3.out",
        });
        tl.from(
          ".s-problem-sub",
          {
            y: 30,
            opacity: 0,
            duration: 0.5,
            ease: "power3.out",
          },
          ">-0.2",
        );
      }

      // ── Section 3: Big number — pin, count up, dramatic ──
      const numSection = document.querySelector(".s-number");
      if (numSection) {
        const numEl = numSection.querySelector(".big-num") as HTMLElement;
        const obj = { val: 0 };
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: numSection,
            start: "top top",
            end: "+=120%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
        tl.to(
          obj,
          {
            val: 27,
            duration: 1,
            ease: "power2.out",
            onUpdate: () => {
              if (numEl) numEl.textContent = "−" + Math.round(obj.val) + "%";
            },
          },
          0,
        );
        tl.from(
          ".big-num",
          {
            scale: 0.5,
            opacity: 0,
            filter: "blur(20px)",
            duration: 0.6,
            ease: "power3.out",
          },
          0,
        );
        tl.from(".big-sub", { y: 30, opacity: 0, duration: 0.5 }, 0.4);
        tl.from(".big-p", { opacity: 0, duration: 0.3 }, 0.6);
      }

      // ── Section 4: How it works — stagger from right ──
      const howSection = document.querySelector(".s-how");
      if (howSection) {
        gsap.from(".how-step", {
          x: 100,
          opacity: 0,
          filter: "blur(8px)",
          stagger: 0.15,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: howSection,
            start: "top 60%",
            toggleActions: "play none none none",
          },
        });
      }

      // ── Section 5: Models — scale up from small ──
      const modelsSection = document.querySelector(".s-models");
      if (modelsSection) {
        gsap.from(".model-item", {
          scale: 0.8,
          opacity: 0,
          y: 40,
          stagger: 0.15,
          duration: 0.8,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: modelsSection,
            start: "top 65%",
            toggleActions: "play none none none",
          },
        });
        // Count up each model score
        modelsSection.querySelectorAll(".model-score").forEach((el) => {
          const htmlEl = el as HTMLElement;
          const target = parseFloat(htmlEl.dataset.target || "0");
          const valObj = { v: 0 };
          gsap.to(valObj, {
            v: target,
            duration: 1.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
              toggleActions: "play none none none",
            },
            onUpdate: () => {
              htmlEl.textContent = String(Math.round(valObj.v));
            },
          });
        });
      }

      // ── Section 6: CTA — fade up ──
      gsap.from(".s-cta-inner > *", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".s-cta",
          start: "top 70%",
          toggleActions: "play none none none",
        },
      });
    }, mainRef);

    return () => ctx.revert();
  }, [globeReady]);

  const pts = POINTS.map((p) => ({
    ...p,
    color: p.hot ? "#E63946" : "rgba(240,236,228,0.4)",
    altitude: 0.012,
  }));
  const rings = POINTS.filter((p) => p.hot).map((p) => ({
    lat: p.lat,
    lng: p.lng,
    maxR: 5,
    propagationSpeed: 0.5,
    repeatPeriod: 2800,
    color: () => "rgba(230,57,70,0.35)",
  }));

  // Split text into word spans
  const Words = ({
    text,
    className = "",
  }: {
    text: string;
    className?: string;
  }) => (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span
          key={i}
          className="word"
          style={{ display: "inline-block", marginRight: "0.3em" }}
        >
          {w}
        </span>
      ))}
    </span>
  );

  return (
    <div ref={mainRef}>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes breathe {
          0%,
          100% {
            box-shadow: 0 0 30px rgba(230, 57, 70, 0.08);
          }
          50% {
            box-shadow: 0 0 70px rgba(230, 57, 70, 0.22);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        body {
          overflow-x: hidden;
        }
      `}</style>

      <main style={{ background: "#0A0A0A" }}>
        {/* ═══ LOADER ═══ */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0A0A0A",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2rem",
            opacity: globeReady ? 0 : 1,
            pointerEvents: globeReady ? "none" : "auto",
            transition: "opacity 0.8s ease",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "2px solid #1A1A1A",
              borderTopColor: "#E63946",
              animation: "spin 1s linear infinite",
            }}
          />
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "#F0ECE4",
            }}
          >
            pixel
            <span style={{ color: "#E63946", fontStyle: "italic" }}>
              Prejudice
            </span>
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: "0.6rem",
              color: "#5A5548",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Loading investigation
          </div>
        </div>

        {/* ═══ GLOBE — fixed, GSAP parallax ═══ */}
        <div
          ref={globeWrapRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {mounted && (
            <Globe
              ref={globeRef}
              width={Math.min(
                typeof window !== "undefined" ? window.innerWidth * 0.85 : 900,
                1000,
              )}
              height={Math.min(
                typeof window !== "undefined" ? window.innerHeight * 0.85 : 900,
                1000,
              )}
              backgroundColor="rgba(0,0,0,0)"
              showGlobe={true}
              showAtmosphere={true}
              atmosphereColor="#E63946"
              atmosphereAltitude={0.2}
              showGraticules={false}
              globeImageUrl=""
              polygonsData={countries}
              polygonCapColor={() => "rgba(35,33,30,0.92)"}
              polygonSideColor={() => "rgba(35,33,30,0.5)"}
              polygonStrokeColor={() => "rgba(200,180,160,0.06)"}
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
              arcColor={() => ["rgba(230,57,70,0.7)", "rgba(230,57,70,0.0)"]}
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

        {/* ═══ CONTENT ═══ */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {/* ── 1. HERO — pinned feel via first viewport ── */}
          <section
            style={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            <div
              className="hero-kicker"
              style={{
                fontFamily: "Inter",
                fontSize: "0.55rem",
                fontWeight: 600,
                letterSpacing: 4,
                color: "#E63946",
                textTransform: "uppercase",
                marginBottom: "2.5rem",
              }}
            >
              An Investigation into AI Vision Bias
            </div>
            <h1 style={{ margin: 0 }}>
              <span
                className="hero-w1"
                style={{
                  display: "block",
                  fontFamily: "'Playfair Display',Georgia,serif",
                  fontSize: "clamp(5rem,14vw,12rem)",
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-6px",
                  color: "rgba(240,236,228,0.95)",
                  textShadow: "0 4px 80px rgba(0,0,0,0.9)",
                }}
              >
                pixel
              </span>
              <span
                className="hero-w2"
                style={{
                  display: "block",
                  fontFamily: "'Playfair Display',Georgia,serif",
                  fontSize: "clamp(5rem,14vw,12rem)",
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: "-6px",
                  color: "#E63946",
                  fontStyle: "italic",
                  textShadow: "0 4px 80px rgba(230,57,70,0.3)",
                  paddingBottom: "0.05em",
                }}
              >
                Prejudice
              </span>
            </h1>
            <div
              className="hero-bottom"
              style={{
                marginTop: "3rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2rem",
              }}
            >
              <Link
                href="/verdict"
                style={{
                  display: "inline-block",
                  background: "#E63946",
                  color: "#F0ECE4",
                  padding: "0.85rem 2.5rem",
                  borderRadius: "8px",
                  fontFamily: "Inter",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                  animation: "breathe 3s ease infinite",
                }}
              >
                Enter the Investigation
              </Link>
              <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
                <rect
                  x="6"
                  y="0"
                  width="8"
                  height="16"
                  rx="4"
                  stroke="rgba(90,85,72,0.4)"
                  strokeWidth="1.5"
                />
                <circle cx="10" cy="7" r="2" fill="#E63946">
                  <animate
                    attributeName="cy"
                    values="6;11;6"
                    dur="2s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
                  />
                </circle>
              </svg>
            </div>
          </section>

          {/* ── 2. THE PROBLEM — pinned, word-by-word reveal ── */}
          <section
            className="s-problem"
            style={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              padding: "0 clamp(3rem,8vw,10rem)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: "#E63946",
                  textTransform: "uppercase",
                  marginBottom: "2rem",
                }}
              >
                <span className="word" style={{ display: "inline-block" }}>
                  The Problem
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: "clamp(2.2rem,5vw,4.2rem)",
                  fontWeight: 700,
                  color: "#F0ECE4",
                  lineHeight: 1.15,
                  letterSpacing: "-2px",
                  maxWidth: 750,
                  margin: 0,
                }}
              >
                <Words text="AI models don't just see faces." />
              </h2>
              <h2
                style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: "clamp(2.2rem,5vw,4.2rem)",
                  fontWeight: 700,
                  color: "#E63946",
                  fontStyle: "italic",
                  lineHeight: 1.15,
                  letterSpacing: "-2px",
                  margin: "0.3rem 0 0",
                }}
              >
                <Words text="They judge them." />
              </h2>
              <p
                className="s-problem-sub"
                style={{
                  fontFamily: "Inter",
                  fontSize: "1rem",
                  color: "#5A5548",
                  lineHeight: 1.8,
                  maxWidth: 480,
                  marginTop: "2.5rem",
                }}
              >
                We tested three leading vision-language models on 10,247 faces
                from 47 countries. The pattern was undeniable.
              </p>
            </div>
          </section>

          {/* ── 3. THE NUMBER — pinned, counts up ── */}
          <section
            className="s-number"
            style={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div>
              <div
                className="big-num"
                style={{
                  fontFamily: "'Playfair Display'",
                  fontSize: "clamp(7rem,20vw,16rem)",
                  fontWeight: 700,
                  color: "#E63946",
                  letterSpacing: "-8px",
                  lineHeight: 0.85,
                  textShadow: "0 0 120px rgba(230,57,70,0.15)",
                }}
              >
                −0%
              </div>
              <div
                className="big-sub"
                style={{
                  fontFamily: "'Playfair Display'",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem,2vw,1.5rem)",
                  color: "#9A9080",
                  marginTop: "2rem",
                  lineHeight: 1.5,
                }}
              >
                trust gap between the lightest
                <br />
                and darkest skin tones
              </div>
              <div
                className="big-p"
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: "0.7rem",
                  color: "#E63946",
                  marginTop: "1.5rem",
                  letterSpacing: 1,
                  animation: "pulse 3s ease infinite",
                }}
              >
                p &lt; 0.001
              </div>
            </div>
          </section>

          {/* ── 4. HOW IT WORKS — stagger from right ── */}
          <section
            className="s-how"
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              padding: "6rem clamp(3rem,8vw,10rem)",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <div
                className="how-step"
                style={{
                  fontFamily: "Inter",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: "#E63946",
                  textTransform: "uppercase",
                  marginBottom: "2.5rem",
                  textAlign: "right",
                }}
              >
                How pixelPrejudice Works
              </div>
              {[
                {
                  n: "01",
                  t: "Collect",
                  d: "10,247 faces from FairFace — 47 countries, 6 Fitzpatrick skin types.",
                },
                {
                  n: "02",
                  t: "Evaluate",
                  d: "Each face judged by Qwen3-30B, Qwen2.5-7B, and Phi-3.5 via our agentic pipeline.",
                },
                {
                  n: "03",
                  t: "Analyze",
                  d: "LLM-as-Judge scoring, statistical correlation analysis, automated bias reporting.",
                },
                {
                  n: "04",
                  t: "Expose",
                  d: "Interactive evidence room — 3D globe, prompt hunting, real-time photo auditing.",
                },
              ].map((step) => (
                <div
                  key={step.n}
                  className="how-step"
                  style={{ textAlign: "right", marginBottom: "2.5rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "flex-end",
                      gap: "0.75rem",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: "0.65rem",
                        color: "#E63946",
                      }}
                    >
                      {step.n}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Playfair Display'",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        color: "#F0ECE4",
                      }}
                    >
                      {step.t}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter",
                      fontSize: "0.85rem",
                      color: "#5A5548",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {step.d}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. THE MODELS — scale up with bounce ── */}
          <section
            className="s-models"
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "6rem 3rem",
            }}
          >
            <div>
              <div
                className="model-item"
                style={{
                  fontFamily: "Inter",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: "#E63946",
                  textTransform: "uppercase",
                  marginBottom: "1.5rem",
                }}
              >
                The Verdict
              </div>
              <div className="model-item" style={{ marginBottom: "4rem" }}>
                <h2
                  style={{
                    fontFamily: "'Playfair Display'",
                    fontSize: "clamp(1.5rem,3vw,2.2rem)",
                    fontWeight: 700,
                    color: "#F0ECE4",
                    letterSpacing: "-1px",
                  }}
                >
                  Three models. All biased.{" "}
                  <span style={{ color: "#E63946", fontStyle: "italic" }}>
                    None innocent.
                  </span>
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "clamp(3rem,6vw,6rem)",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { name: "Phi-3.5", score: 793, corr: "-0.207", worst: true },
                  {
                    name: "Qwen2.5-7B",
                    score: 894,
                    corr: "-0.106",
                    worst: false,
                  },
                  {
                    name: "Qwen3-30B",
                    score: 911,
                    corr: "-0.089",
                    worst: false,
                  },
                ].map((m) => (
                  <div
                    key={m.name}
                    className="model-item"
                    style={{ textAlign: "center" }}
                  >
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: "clamp(2.5rem,6vw,4.5rem)",
                        fontWeight: 700,
                        color: m.worst ? "#E63946" : "#F0ECE4",
                        letterSpacing: "-2px",
                        textShadow: m.worst
                          ? "0 0 60px rgba(230,57,70,0.2)"
                          : "none",
                      }}
                    >
                      <span className="model-score" data-target={m.score}>
                        0
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter",
                        fontSize: "0.55rem",
                        color: "#5A5548",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      fairness ×1000
                    </div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display'",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#F0ECE4",
                        marginTop: "0.75rem",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: "0.75rem",
                        color: "#E63946",
                        marginTop: "0.25rem",
                      }}
                    >
                      {m.corr}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 6. CTA ── */}
          <section
            className="s-cta"
            style={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div className="s-cta-inner">
              <div
                style={{
                  fontFamily: "'Playfair Display'",
                  fontStyle: "italic",
                  fontSize: "clamp(1.2rem,2.5vw,1.6rem)",
                  color: "#9A9080",
                  lineHeight: 1.7,
                  maxWidth: 480,
                  marginBottom: "3rem",
                }}
              >
                "A 2-point gap on a 10-point scale is not noise. It is
                prejudice, encoded in weights."
              </div>
              <div>
                <Link
                  href="/verdict"
                  style={{
                    display: "inline-block",
                    background: "#E63946",
                    color: "#F0ECE4",
                    padding: "1rem 3.5rem",
                    borderRadius: "8px",
                    fontFamily: "Inter",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    animation: "breathe 3s ease infinite",
                  }}
                >
                  Enter the Investigation
                </Link>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "3rem",
                  marginTop: "3rem",
                  justifyContent: "center",
                }}
              >
                {[
                  { href: "/evidence", l: "Evidence" },
                  { href: "/hunt", l: "Hunt" },
                  { href: "/audit", l: "Audit" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      fontFamily: "Inter",
                      fontSize: "0.75rem",
                      color: "#5A5548",
                      textDecoration: "none",
                      letterSpacing: 1,
                      borderBottom: "1px solid #222",
                      paddingBottom: 4,
                    }}
                  >
                    {link.l}
                  </Link>
                ))}
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: "0.5rem",
                  color: "#333",
                  marginTop: "5rem",
                  letterSpacing: 1,
                }}
              >
                pixelPrejudice · TUM × Sony AI Hackathon 2026
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
