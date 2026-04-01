export default function Home() {
  return (
    <main>
      <div className="hero">
        <div className="hero-inner">
          <h1>VLM Bias Evaluation</h1>
          <p className="hero-desc" style={{ color: 'var(--text-s)', maxWidth: '620px', margin: '0 auto 2.5rem' }}>
            Comprehensive fairness analysis of 3 Vision-Language Models.
            Statistically significant bias detected across all tested architectures.
          </p>
        </div>
      </div>

      <div className="container">
        <section>
          <div className="model-grid">
            {/* Phi */}
            <div className="mc phi">
              <div className="mc-head">
                <div><div className="mc-org">Microsoft</div><div className="mc-name">Phi-3.5-vision-instruct</div></div>
                <span className="mc-badge base">Baseline</span>
              </div>
              <div className="mc-stats">
                <div><div className="mc-sv phi">0.793</div><div className="mc-sk">Fairness Score</div></div>
                <div><div className="mc-sv phi" style={{ color: 'var(--danger)' }}>High</div><div className="mc-sk">Bias Severity</div></div>
              </div>
            </div>

            {/* Qwen 7B */}
            <div className="mc q7b">
              <div className="mc-head">
                <div><div className="mc-org">Qwen / Alibaba</div><div className="mc-name">Qwen2.5-VL-7B-Instruct</div></div>
                <span className="mc-badge mid">Efficient</span>
              </div>
              <div className="mc-stats">
                <div><div className="mc-sv q7b">0.894</div><div className="mc-sk">Fairness Score</div></div>
                <div><div className="mc-sv q7b" style={{ color: 'var(--warn)' }}>Medium</div><div className="mc-sk">Bias Severity</div></div>
              </div>
            </div>

            {/* Qwen 30B */}
            <div className="mc q30">
              <div className="mc-head">
                <div><div className="mc-org">Qwen / Alibaba</div><div className="mc-name">Qwen3-VL-30B-A3B-Instruct</div></div>
                <span className="mc-badge best">Best Overall</span>
              </div>
              <div className="mc-stats">
                <div><div className="mc-sv q30">0.911</div><div className="mc-sk">Fairness Score</div></div>
                <div><div className="mc-sv q30" style={{ color: 'var(--accent)' }}>Moderate</div><div className="mc-sk">Bias Severity</div></div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bias-box">
            <div className="bias-alert">
              <span className="bias-alert-icon">⚠</span>
              <div className="bias-alert-txt">
                <strong>Statistically Significant Bias Detected:</strong> Darker skin tone is consistently associated with lower
                trustworthiness and intelligence scores assigned by all three VLMs.
              </div>
            </div>
            <p style={{ color: 'var(--text-s)', fontSize: '0.9rem' }}>
              Our evaluation shows that even the most advanced models exhibit systematic disparities in how they perceive and score individuals based on physical attributes.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
