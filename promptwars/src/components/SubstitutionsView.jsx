import React from 'react';
import { TrendingDown, ArrowRight } from 'lucide-react';

export default function SubstitutionsView({ substitutions }) {
  if (substitutions.length === 0) return null;

  return (
    <section className="plan-card">
      <div className="section-title-row">
        <TrendingDown className="title-icon yellow" />
        <h3>Smart Substitutions</h3>
      </div>
      <p className="section-desc">Healthy dietary swaps and cost-saving alternatives for today's menu:</p>
      
      <div className="subs-grid">
        {substitutions.map((sub, idx) => (
          <div key={idx} className="sub-box">
            <div className="sub-header">
              <span className="sub-original">{sub.original}</span>
              <ArrowRight className="sub-arrow" />
              <span className="sub-alternative">{sub.alternative}</span>
            </div>
            <p className="sub-reason">{sub.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
