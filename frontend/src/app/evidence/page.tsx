'use client';

import { useState } from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// Data extracted from json_reports
const REGIONAL_DATA: any = {
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

const MAP_PATHS = [
  { id: "Africa", name: "Africa", d: "M450,190 L580,180 L650,250 L620,380 L550,450 L480,380 L420,250 Z" },
  { id: "Americas", name: "Americas", d: "M150,50 L280,40 L350,100 L320,180 L250,220 L280,260 L350,280 L380,350 L320,480 L280,450 L250,350 L200,250 L180,220 L100,150 L80,80 Z" },
  { id: "Asia", name: "Asia", d: "M580,50 L900,60 L950,250 L800,350 L700,320 L600,250 L580,120 Z" },
  { id: "Europe", name: "Europe", d: "M450,60 L550,50 L580,120 L520,180 L460,170 L420,120 Z" },
  { id: "Other", name: "Oceania", d: "M800,380 L920,370 L950,450 L850,480 L780,440 Z" }
];

export default function Evidence() {
  const [selectedModel, setSelectedModel] = useState("Qwen3-30B");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    setIsChatLoading(true);
    setChatResponse(null);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: chatInput,
          context: {
            model: selectedModel,
            regionalData: REGIONAL_DATA[selectedModel]
          }
        }),
      });

      const data = await response.json();
      if (data.error) {
        setChatResponse(`Error: ${data.error}`);
      } else {
        setChatResponse(data.answer);
      }
    } catch (err) {
      console.error(err);
      setChatResponse("Failed to connect to the analysis engine.");
    } finally {
      setIsChatLoading(false);
      setChatInput('');
    }
  };

  const radarData = {
    labels: ['Demographic Accuracy', 'Physical Traits', 'Context', 'Action', 'Fairness'],
    datasets: [
      {
        label: 'Phi-3.5',
        data: [0.39, 0.27, 0.04, 0.15, 0.79],
        backgroundColor: 'rgba(251, 146, 60, 0.2)',
        borderColor: '#fb923c',
        borderWidth: 2,
      },
      {
        label: 'Qwen 7B',
        data: [0.57, 0.42, 0.38, 0.17, 0.89],
        backgroundColor: 'rgba(167, 139, 250, 0.2)',
        borderColor: '#a78bfa',
        borderWidth: 2,
      },
      {
        label: 'Qwen 30B',
        data: [0.59, 0.47, 0.32, 0.23, 0.91],
        backgroundColor: 'rgba(52, 211, 153, 0.2)',
        borderColor: '#34d399',
        borderWidth: 2,
      },
    ],
  };

  const getRegionColor = (regionId: string) => {
    if (!REGIONAL_DATA[selectedModel][regionId]) return "#1e2d4a";
    const ses = REGIONAL_DATA[selectedModel][regionId].ses;
    // Simple color scale for SES (1 to 4)
    if (ses > 3) return "#34d399"; // Green
    if (ses > 2) return "#fbbf24"; // Yellow
    return "#f87171"; // Red
  };

  return (
    <main className="container">
      <section>
        <div className="sec-head">
          <h2 className="sec-title">The Evidence</h2>
          <p className="sec-desc">A deep dive into the data behind the bias.</p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ marginRight: '1rem', fontSize: '0.9rem', color: 'var(--text-s)' }}>Selected Model:</label>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.4rem', borderRadius: '4px' }}
          >
            <option value="Qwen3-30B">Qwen3-VL-30B</option>
            <option value="Qwen2.5-7B">Qwen2.5-VL-7B</option>
            <option value="Phi-3.5">Phi-3.5-Vision</option>
          </select>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Global SES Bias Map</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{ width: 10, height: 10, background: '#f87171' }}></div> Low SES Score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{ width: 10, height: 10, background: '#fbbf24' }}></div> Mid SES Score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{ width: 10, height: 10, background: '#34d399' }}></div> High SES Score</div>
            </div>
          </div>
          
          <div style={{ position: 'relative', height: '500px', background: '#060b17', borderRadius: '8px', overflow: 'hidden' }}>
            <svg viewBox="0 0 1000 600" style={{ width: '100%', height: '100%' }}>
              {MAP_PATHS.map(path => (
                <path
                  key={path.id}
                  d={path.d}
                  fill={getRegionColor(path.id)}
                  stroke="var(--bg)"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion(path.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'pointer', transition: 'fill 0.3s', opacity: hoveredRegion === path.id ? 0.8 : 1 }}
                />
              ))}
            </svg>
            
            {hoveredRegion && REGIONAL_DATA[selectedModel][hoveredRegion] && (
              <div style={{ 
                position: 'absolute', 
                top: '20px', 
                right: '20px', 
                background: 'rgba(12, 21, 38, 0.9)', 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--accent)',
                zIndex: 10,
                minWidth: '200px'
              }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>{hoveredRegion}</h4>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Samples:</span> <span>{REGIONAL_DATA[selectedModel][hoveredRegion].count}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SES Score:</span> <span>{REGIONAL_DATA[selectedModel][hoveredRegion].ses.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Trustworthiness:</span> <span>{REGIONAL_DATA[selectedModel][hoveredRegion].trust.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gender Acc:</span> <span>{(REGIONAL_DATA[selectedModel][hoveredRegion].genderAcc * 100).toFixed(1)}%</span></div>
                </div>
              </div>
            )}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-s)' }}>
            Map colored by average Socioeconomic Status (SES) score assigned by the model. Red indicates regions where the model consistently predicts lower SES for subjects.
          </p>
        </div>
      </section>

      <section>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Cross-Model Performance Radar</h3>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Radar data={radarData} options={{
              scales: {
                r: {
                  grid: { color: 'var(--border)' },
                  angleLines: { color: 'var(--border)' },
                  pointLabels: { color: 'var(--text-s)' },
                  ticks: { display: false }
                }
              },
              plugins: {
                legend: { labels: { color: 'var(--text-s)' } }
              }
            }} />
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Ask the Data</h3>
          <div style={{ background: '#060b17', borderRadius: '8px', padding: '1rem', height: '250px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, color: 'var(--text-m)', fontSize: '0.9rem', overflowY: 'auto', marginBottom: '1rem' }}>
              {isChatLoading ? (
                <div style={{ color: 'var(--accent)', animation: 'pulse 1.5s infinite' }}>Analyzing dataset with Gemini...</div>
              ) : chatResponse ? (
                <div style={{ color: 'var(--accent)' }}><b>AI Assistant:</b> {chatResponse}</div>
              ) : (
                "Chat with the FHIBE dataset analyzer... Ask about regional disparities or specific model performance."
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                disabled={isChatLoading}
                placeholder="e.g., 'Compare gender accuracy across all regions'"
                style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem', color: 'var(--text)', opacity: isChatLoading ? 0.5 : 1 }}
              />
              <button 
                onClick={handleChat} 
                disabled={isChatLoading || !chatInput.trim()}
                style={{ background: 'var(--accent)', color: '#060b17', border: 'none', borderRadius: '4px', padding: '0 1rem', fontWeight: 'bold', cursor: isChatLoading ? 'not-allowed' : 'pointer' }}
              >
                {isChatLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </section>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  );
}
