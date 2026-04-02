'use client';

import Link from 'next/link';

export default function Verdict() {
  return (
    <main style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 3.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            fontFamily: 'Inter', fontSize: '0.55rem', fontWeight: 700,
            letterSpacing: 3, color: '#E63946', textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>The Verdict</div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700,
            color: '#F0ECE4', lineHeight: 1.2, letterSpacing: '-1.5px',
            marginBottom: '1rem',
          }}>
            Every model we tested rates darker-skinned faces as less trustworthy.
            <span style={{ color: '#E63946', fontStyle: 'italic' }}> Every single one.</span>
          </h1>
          <p style={{
            fontFamily: 'Inter', fontSize: '0.95rem', color: '#9A9080',
            lineHeight: 1.7, maxWidth: 600,
          }}>
            We ran 10,247 faces from 47 countries through three leading vision-language models.
            The correlation between darker skin and lower trust scores was statistically significant across all of them.
          </p>
        </div>

        {/* Model cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { name: 'Phi-3.5-Vision', org: 'Microsoft', fairness: '0.793', genderAcc: '86.2%', skinTrust: '-0.207', skinIntel: '-0.211', ageMae: '8.9 yrs', worst: true },
            { name: 'Qwen2.5-VL-7B', org: 'Alibaba', fairness: '0.894', genderAcc: '96.5%', skinTrust: '-0.106', skinIntel: '-0.246', ageMae: '6.8 yrs', worst: false },
            { name: 'Qwen3-VL-30B', org: 'Alibaba', fairness: '0.911', genderAcc: '96.8%', skinTrust: '-0.089', skinIntel: 'n.s.', ageMae: '5.3 yrs', worst: false },
          ].map(model => (
            <div key={model.name} style={{
              background: '#111', border: `1px solid ${model.worst ? 'rgba(230,57,70,0.3)' : '#222'}`,
              borderRadius: 12, padding: '1.5rem',
              boxShadow: model.worst ? '0 4px 24px rgba(230,57,70,0.06)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#F0ECE4' }}>{model.name}</div>
                  <div style={{ fontSize: '0.6rem', color: '#5A5548', marginTop: 2 }}>{model.org}</div>
                </div>
                {model.worst && (
                  <span style={{
                    fontSize: '0.45rem', fontWeight: 700, letterSpacing: 1,
                    color: '#E63946', border: '1px solid #E63946',
                    padding: '0.2rem 0.5rem', background: 'rgba(230,57,70,0.08)',
                  }}>MOST BIASED</span>
                )}
              </div>
              <div style={{ height: 1, background: model.worst ? 'rgba(230,57,70,0.2)' : '#222', marginBottom: '1rem' }} />
              {[
                { label: 'Fairness Score', value: model.fairness, color: parseFloat(model.fairness) < 0.85 ? '#E63946' : '#F0ECE4' },
                { label: 'Gender Accuracy', value: model.genderAcc, color: parseFloat(model.genderAcc) < 90 ? '#E6A817' : '#F0ECE4' },
                { label: 'Age MAE', value: model.ageMae, color: '#F0ECE4' },
                { label: 'Skin → Trust', value: model.skinTrust, color: '#E63946' },
                { label: 'Skin → Intelligence', value: model.skinIntel, color: model.skinIntel === 'n.s.' ? '#5A5548' : '#E63946' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#9A9080' }}>{stat.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600, color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Finding callout */}
        <div style={{
          background: '#111', border: '1px solid rgba(230,57,70,0.25)',
          borderRadius: 12, padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 20px rgba(230,57,70,0.06)',
          marginBottom: '3rem',
        }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: 1, color: '#E63946', flexShrink: 0 }}>FINDING</span>
          <div style={{ width: 1, height: 16, background: '#222' }} />
          <span style={{ fontSize: '0.85rem', color: '#9A9080', lineHeight: 1.5 }}>
            All 3 models show negative correlation between darker skin tones and perceived trustworthiness.
            Phi-3.5-Vision exhibits 2.6× more bias than Qwen3-VL-30B.
          </span>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '5rem',
          borderTop: '1px solid #222', borderBottom: '1px solid #222',
          padding: '2.5rem 0', marginBottom: '3rem',
        }}>
          {[
            { num: '10,247', label: 'faces analyzed' },
            { num: '3', label: 'VLMs compared' },
            { num: '6', label: 'Fitzpatrick types' },
            { num: '47', label: 'countries' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#F0ECE4' }}>{s.num}</div>
              <div style={{ fontSize: '0.65rem', color: '#5A5548', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic', fontSize: '1.3rem', color: '#F0ECE4',
          lineHeight: 1.6, maxWidth: 550, margin: '0 auto', textAlign: 'center',
        }}>
          "A 2-point gap on a 10-point scale is not noise.
          It is prejudice, encoded in weights."
        </div>
      </div>
    </main>
  );
}
