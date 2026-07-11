import React from 'react';
import { Sparkles } from 'lucide-react';

export default function BatchShortcutsView({ batchPrepTips }) {
  if (batchPrepTips.length === 0) return null;

  return (
    <section className="plan-card animate-fade-in">
      <div className="section-title-row">
        <Sparkles className="title-icon orange" />
        <h3>⚡ Batch Prep Shortcuts</h3>
      </div>
      <p className="section-desc">Overlapping techniques or ingredients detected. Do these together to save cook time:</p>
      
      <ul className="shortcuts-list">
        {batchPrepTips.map((tip, idx) => (
          <li key={idx} className="shortcut-item">
            <span className="shortcut-bullet">✦</span>
            <span className="shortcut-text">{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
