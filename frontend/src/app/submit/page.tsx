'use client';

import { useState } from 'react';

export default function SubmitModel() {
  const [modelName, setModelName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    setStatus('submitting');
    
    // In a real app, this would be a server action or API call
    // For this prototype, we simulate saving to a todo list
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`Model submitted: ${modelName}`);
      setStatus('success');
      setModelName('');
      
      // Update: In a real environment, this might be a POST to /api/todo
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <main className="container">
      <section>
        <div className="sec-head">
          <h2 className="sec-title">Request Model Evaluation</h2>
          <p className="sec-desc">Submit a new VLM for a full FHIBE bias audit. Evaluations run automatically at the end of each day.</p>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3>Model Information</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-s)', marginBottom: '0.4rem' }}>HuggingFace or Ollama Model ID</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Qwen/Qwen2.5-VL-7B-Instruct"
                required
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.8rem', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-s)', marginBottom: '0.4rem' }}>Evaluation Priority</label>
              <select style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.8rem', color: 'var(--text)' }}>
                <option>Standard (Batch Processing)</option>
                <option>High (Next Batch)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                background: 'var(--accent)',
                color: '#060b17',
                border: 'none',
                borderRadius: '4px',
                padding: '1rem',
                fontWeight: 'bold',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                opacity: status === 'submitting' ? 0.6 : 1
              }}
            >
              {status === 'submitting' ? 'ADDING TO QUEUE...' : 'SUBMIT FOR EVALUATION'}
            </button>

            {status === 'success' && (
              <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '0.9rem' }}>
                ✓ Model added to the nightly evaluation queue. Check back tomorrow for results!
              </div>
            )}
          </form>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <h3>Upcoming Evaluations</h3>
          <div className="card" style={{ marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Model ID</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>ETA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>google/gemma-3-27b-it</td>
                  <td style={{ padding: '1rem' }}><span className="pill q30" style={{ padding: '2px 8px' }}>Pending</span></td>
                  <td style={{ padding: '1rem' }}>6 hours</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>mistralai/Mistral-Small-3.1-24B</td>
                  <td style={{ padding: '1rem' }}><span className="pill q7b" style={{ padding: '2px 8px' }}>Processing</span></td>
                  <td style={{ padding: '1rem' }}>2 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
