'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const REGIONAL_DATA: Record<string, Record<string, { count: number; trust: number; ses: number; genderAcc: number }>> = {
  "Qwen3-30B": {
    "Africa": { count: 4907, trust: 6.77, ses: 3.05, genderAcc: 0.97 },
    "Americas": { count: 448, trust: 6.81, ses: 2.11, genderAcc: 0.96 },
    "Asia": { count: 4143, trust: 6.87, ses: 2.13, genderAcc: 0.97 },
    "Europe": { count: 783, trust: 6.72, ses: 2.72, genderAcc: 0.93 },
    "Other": { count: 83, trust: 7.02, ses: 1.10, genderAcc: 0.88 }
  },
  "Qwen2.5-7B": {
    "Africa": { count: 5249, trust: 6.37, ses: 2.80, genderAcc: 0.97 },
    "Americas": { count: 472, trust: 6.50, ses: 2.05, genderAcc: 0.95 },
    "Asia": { count: 4327, trust: 6.67, ses: 1.98, genderAcc: 0.97 },
    "Europe": { count: 807, trust: 6.57, ses: 2.65, genderAcc: 0.92 },
    "Other": { count: 84, trust: 6.85, ses: 1.05, genderAcc: 0.89 }
  },
  "Phi-3.5": {
    "Africa": { count: 5069, trust: 6.89, ses: 2.95, genderAcc: 0.84 },
    "Americas": { count: 425, trust: 7.14, ses: 2.20, genderAcc: 0.85 },
    "Asia": { count: 4118, trust: 7.70, ses: 2.15, genderAcc: 0.90 },
    "Europe": { count: 741, trust: 7.34, ses: 2.75, genderAcc: 0.86 },
    "Other": { count: 76, trust: 8.12, ses: 1.15, genderAcc: 0.83 }
  }
};

const POINTS = [
  { lat: 9.1, lng: 18.7, region: "Africa", label: "Sub-Saharan Africa" },
  { lat: 30.0, lng: 31.2, region: "Africa", label: "North Africa" },
  { lat: -1.3, lng: 36.8, region: "Africa", label: "East Africa" },
  { lat: 6.5, lng: 3.4, region: "Africa", label: "West Africa" },
  { lat: 40.7, lng: -74.0, region: "Americas", label: "North America" },
  { lat: -23.5, lng: -46.6, region: "Americas", label: "South America" },
  { lat: 35.7, lng: 139.7, region: "Asia", label: "East Asia" },
  { lat: 28.6, lng: 77.2, region: "Asia", label: "South Asia" },
  { lat: 1.35, lng: 103.8, region: "Asia", label: "Southeast Asia" },
  { lat: 39.9, lng: 116.4, region: "Asia", label: "China" },
  { lat: 51.5, lng: -0.1, region: "Europe", label: "Northern Europe" },
  { lat: 48.9, lng: 2.35, region: "Europe", label: "Western Europe" },
  { lat: 41.9, lng: 12.5, region: "Europe", label: "Southern Europe" },
  { lat: -33.9, lng: 151.2, region: "Other", label: "Oceania" },
];

// Arcs connecting regions with high bias disparity
const ARC_DATA = [
  { startLat: 51.5, startLng: -0.1, endLat: 9.1, endLng: 18.7, color: ['rgba(230,57,70,0.6)', 'rgba(230,57,70,0.05)'] },
  { startLat: 35.7, startLng: 139.7, endLat: -1.3, endLng: 36.8, color: ['rgba(230,57,70,0.4)', 'rgba(230,57,70,0.05)'] },
  { startLat: 40.7, startLng: -74.0, endLat: 6.5, endLng: 3.4, color: ['rgba(230,57,70,0.3)', 'rgba(230,57,70,0.05)'] },
  { startLat: 48.9, startLng: 2.35, endLat: 28.6, endLng: 77.2, color: ['rgba(230,167,23,0.3)', 'rgba(230,167,23,0.05)'] },
];

export default function Evidence() {
  const [selectedModel, setSelectedModel] = useState("Qwen3-30B");
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai'; text: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);

  // Load country polygons (GeoJSON)
  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2/countries-50m.json')
      .then(r => r.json())
      .then(async (worldData) => {
        // Dynamic import topojson-client
        const topojson = await import('topojson-client');
        const lands = topojson.feature(worldData, worldData.objects.countries) as any;
        setCountries(lands.features);
      })
      .catch(console.error);
  }, []);

  // Fallback: dismiss loader after 4s no matter what
  useEffect(() => {
    const fallback = setTimeout(() => setGlobeReady(true), 4000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const configureGlobe = useCallback(() => {
    if (!globeRef.current) return;
    const globe = globeRef.current;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.enableZoom = true;
    controls.minDistance = 220;
    controls.maxDistance = 450;

    globe.pointOfView({ lat: 20, lng: 20, altitude: 2.5 }, 0);

    // Dark transparent globe — countries sit on top
    const globeMaterial = globe.globeMaterial();
    globeMaterial.color.set('#0E0E0E');
    globeMaterial.opacity = 0.85;
    globeMaterial.transparent = true;
    setTimeout(() => setGlobeReady(true), 600);
  }, []);

  useEffect(() => {
    if (dimensions.width > 0) {
      // Small delay to let globe mount
      const t = setTimeout(configureGlobe, 300);
      return () => clearTimeout(t);
    }
  }, [dimensions, configureGlobe]);

  const pointsData = useMemo(() => {
    const modelData = REGIONAL_DATA[selectedModel];
    return POINTS.map(p => {
      const rd = modelData[p.region];
      const biasLevel = rd ? Math.max(0, 3.5 - rd.ses) / 3.5 : 0;
      return {
        ...p,
        size: rd ? 0.25 + (rd.count / 5000) * 0.4 : 0.15,
        color: biasLevel > 0.3 ? '#E63946' : '#F0ECE4',
        altitude: 0.005 + biasLevel * 0.02,
        trust: rd?.trust ?? 0,
        ses: rd?.ses ?? 0,
        genderAcc: rd?.genderAcc ?? 0,
        count: rd?.count ?? 0,
      };
    });
  }, [selectedModel]);

  // Rings — pulsing halos around high-bias points
  const ringsData = useMemo(() => {
    const modelData = REGIONAL_DATA[selectedModel];
    return POINTS
      .filter(p => {
        const rd = modelData[p.region];
        return rd && rd.trust < 6.6;
      })
      .map(p => ({
        lat: p.lat,
        lng: p.lng,
        maxR: 3,
        propagationSpeed: 1.5,
        repeatPeriod: 1200,
        color: () => '#E63946',
      }));
  }, [selectedModel]);

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatOpen(true);
    setIsChatLoading(true);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          context: { model: selectedModel, regionalData: REGIONAL_DATA[selectedModel] }
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: data.error ? `Error: ${data.error}` : data.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Failed to connect to the analysis engine." }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const regionRows = Object.entries(REGIONAL_DATA[selectedModel])
    .sort((a, b) => a[1].trust - b[1].trust);

  return (
    <div className="evidence-globe-wrap" ref={containerRef}>
      {/* Loading screen */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 9999,
        background: '#0A0A0A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
        opacity: globeReady ? 0 : 1,
        pointerEvents: globeReady ? 'none' : 'auto',
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid #1A1A1A', borderTopColor: '#E63946',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#F0ECE4' }}>
          Loading Evidence
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: '0.55rem', color: '#5A5548', letterSpacing: 2, textTransform: 'uppercase' }}>
          Mapping global bias data
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          showGlobe={true}
          showAtmosphere={true}
          atmosphereColor="#E63946"
          atmosphereAltitude={0.12}
          showGraticules={false}
          globeImageUrl=""
          polygonsData={countries}
          polygonCapColor={() => 'rgba(30,28,26,0.85)'}
          polygonSideColor={() => 'rgba(30,28,26,0.4)'}
          polygonStrokeColor={() => 'rgba(230,57,70,0.15)'}
          polygonAltitude={0.006}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointRadius="size"
          pointColor="color"
          pointsMerge={false}
          arcsData={ARC_DATA}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcStroke={0.5}
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor="color"
          pointLabel={(d: any) => `
            <div style="background:rgba(10,10,10,.95);backdrop-filter:blur(16px);border:1px solid rgba(230,57,70,0.2);padding:12px 16px;font-family:Inter,sans-serif;min-width:200px;box-shadow:0 12px 40px rgba(0,0,0,0.6);border-radius:10px">
              <div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:15px;color:#F0ECE4;margin-bottom:8px">${d.label}</div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#9A9080;margin-bottom:4px;padding:3px 0"><span>Trust Score</span><span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${d.trust < 6.5 ? '#E63946' : '#F0ECE4'}">${d.trust.toFixed(2)}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#9A9080;margin-bottom:4px;padding:3px 0"><span>SES Score</span><span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#F0ECE4">${d.ses.toFixed(2)}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#9A9080;padding:3px 0"><span>Gender Acc.</span><span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#F0ECE4">${(d.genderAcc * 100).toFixed(1)}%</span></div>
              <div style="font-size:10px;color:#5A5548;margin-top:8px;padding-top:8px;border-top:1px solid #222">${d.count.toLocaleString()} samples</div>
            </div>
          `}
        />
      )}

      {/* Model Selector */}
      <div style={{
        position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '0.5rem', zIndex: 10,
      }}>
        {['Qwen3-30B', 'Qwen2.5-7B', 'Phi-3.5'].map(model => (
          <button key={model} onClick={() => setSelectedModel(model)} style={{
            background: selectedModel === model ? '#E63946' : 'rgba(10,10,10,.85)',
            color: selectedModel === model ? '#F0ECE4' : '#9A9080',
            border: '1px solid ' + (selectedModel === model ? '#E63946' : '#222'),
            backdropFilter: 'blur(12px)',
            borderRadius: '8px',
            padding: '0.4rem 1rem',
            fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {model === 'Qwen3-30B' ? 'Qwen3-VL-30B' : model === 'Qwen2.5-7B' ? 'Qwen2.5-VL-7B' : 'Phi-3.5-Vision'}
          </button>
        ))}
      </div>

      {/* Left Panel — Region Trust Scores */}
      <div className="evidence-panel" style={{ top: '5rem', left: '2.5rem', width: 280 }}>
        <h4>Region Trust Scores</h4>
        <div style={{ height: 1, background: '#222', marginBottom: '0.75rem' }} />
        {regionRows.map(([region, data]) => (
          <div key={region} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
            <span style={{ fontSize: '0.8rem', color: '#9A9080' }}>{region}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600,
              color: data.trust < 6.5 ? '#E63946' : '#F0ECE4',
            }}>{data.trust.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Right Panel — Key Correlations */}
      <div className="evidence-panel" style={{ top: '5rem', right: '2.5rem', width: 280 }}>
        <h4>Key Correlations</h4>
        <div style={{ height: 1, background: '#222', marginBottom: '0.75rem' }} />
        {[
          { finding: 'Darker skin → lower trust', p: 'p < 0.001', danger: true },
          { finding: 'Female → higher warmth', p: 'p < 0.01', danger: false },
          { finding: 'Young → higher competence', p: 'p < 0.05', danger: false },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0' }}>
            <div style={{ width: 4, height: 4, background: item.danger ? '#E63946' : '#5A5548', borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#9A9080', flex: 1 }}>{item.finding}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: item.danger ? '#E63946' : '#5A5548' }}>{item.p}</span>
          </div>
        ))}
      </div>

      {/* Big Stats — bottom left */}
      <div className="evidence-big-stat" style={{ bottom: '8rem', left: '2.5rem' }}>
        <div className="num">10,247</div>
        <div className="lbl">faces analyzed</div>
      </div>
      <div className="evidence-big-stat" style={{ bottom: '4.5rem', left: '2.5rem' }}>
        <div className="num">47</div>
        <div className="lbl">countries represented</div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '2rem', left: '2.5rem',
        display: 'flex', gap: '1rem', zIndex: 10,
      }}>
        {[
          { color: '#E63946', label: 'High bias' },
          { color: '#F0ECE4', label: 'Low bias' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 8, height: 8, background: item.color, borderRadius: '50%', boxShadow: item.color === '#E63946' ? '0 0 8px rgba(230,57,70,0.5)' : 'none' }} />
            <span style={{ fontSize: '0.6875rem', color: '#9A9080' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── Centered Command Palette Chat ── */}
      <div style={{
        position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
        width: 560, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Messages — grow upward, collapsible */}
        {chatOpen && chatMessages.length > 0 && !chatMinimized && (
          <div style={{
            background: 'rgba(10,10,10,.95)', backdropFilter: 'blur(24px)',
            border: '1px solid #222', borderBottom: 'none',
            borderRadius: '14px 14px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Collapse handle + header */}
            <div
              onClick={() => setChatMinimized(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 1.25rem', borderBottom: '1px solid #1A1A1A',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: 1.5, color: '#E63946', textTransform: 'uppercase' }}>
                  Conversation
                </div>
                <span style={{ fontSize: '0.6rem', color: '#5A5548' }}>
                  {chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#5A5548' }}>▼ Minimize</span>
            </div>

            {/* Scrollable messages */}
            <div style={{
              maxHeight: 240, overflowY: 'auto',
              padding: '0.75rem 1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    fontSize: '0.5rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 3, textTransform: 'uppercase',
                    color: msg.role === 'user' ? '#5A5548' : '#E63946',
                  }}>
                    {msg.role === 'user' ? 'YOU' : 'AI ANALYSIS'}
                  </div>
                  <div style={{
                    background: msg.role === 'user' ? '#1A1A1A' : 'rgba(230,57,70,0.06)',
                    border: `1px solid ${msg.role === 'user' ? '#222' : 'rgba(230,57,70,0.12)'}`,
                    borderRadius: msg.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                    padding: '0.5rem 0.75rem', maxWidth: '85%',
                    fontSize: '0.78rem', lineHeight: 1.55,
                    color: msg.role === 'user' ? '#F0ECE4' : '#9A9080',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: 1.5, color: '#E63946', marginBottom: 3 }}>AI ANALYSIS</div>
                  <div style={{
                    background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.12)',
                    borderRadius: '10px 10px 10px 3px', padding: '0.5rem 0.75rem',
                    fontSize: '0.78rem', color: '#E63946',
                  }}>
                    <span className="chat-pulse">Analyzing dataset...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Minimized badge — shows when collapsed, click to expand */}
        {chatOpen && chatMessages.length > 0 && chatMinimized && (
          <div
            onClick={() => setChatMinimized(false)}
            style={{
              background: 'rgba(10,10,10,.95)', backdropFilter: 'blur(24px)',
              border: '1px solid #222', borderBottom: 'none',
              borderRadius: '14px 14px 0 0',
              padding: '0.4rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E63946' }} />
              <span style={{ fontSize: '0.7rem', color: '#9A9080' }}>
                {chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#5A5548' }}>▲ Expand</span>
          </div>
        )}

        {/* Input bar — always centered at bottom */}
        <div style={{
          background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(24px)',
          border: '1px solid #222',
          borderRadius: (chatOpen && chatMessages.length > 0) ? '0 0 14px 14px' : '14px',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5548" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            onFocus={() => { setChatOpen(true); setChatMinimized(false); }}
            disabled={isChatLoading}
            placeholder={isChatLoading ? 'Analyzing...' : 'Ask about the data...'}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
              color: '#F0ECE4', outline: 'none',
            }}
          />
          {chatOpen && chatMessages.length > 0 && (
            <button onClick={() => { setChatMessages([]); setChatOpen(false); setChatMinimized(false); }} style={{
              background: 'none', border: 'none', color: '#5A5548',
              cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'Inter, sans-serif',
              padding: '0.2rem 0.4rem', flexShrink: 0,
            }}>
              Clear
            </button>
          )}
          <button onClick={handleChat} disabled={isChatLoading || !chatInput.trim()} style={{
            background: '#E63946', color: '#F0ECE4', border: 'none', borderRadius: '8px',
            padding: '0.35rem 0.85rem', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600,
            cursor: isChatLoading ? 'not-allowed' : 'pointer', opacity: (isChatLoading || !chatInput.trim()) ? 0.4 : 1,
            flexShrink: 0, transition: 'opacity 0.2s',
          }}>
            {isChatLoading ? '...' : 'Enter'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .chat-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
