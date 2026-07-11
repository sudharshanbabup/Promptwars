import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function BudgetWidget({ budgetFeasibility, budget, remainingCostToBuy, currencySymbol }) {
  const { totalCost, feasible, margin, itemizedCosts } = budgetFeasibility;
  
  // Calculate gauge angle (percentage of budget used, capped at 100%)
  const percentage = Math.min((totalCost / (budget || 1)) * 100, 100);
  const strokeDashoffset = 126 - (126 * percentage) / 100;
  
  // Gauge color class based on status
  let gaugeColorClass = 'green';
  if (totalCost > budget) {
    gaugeColorClass = 'red';
  } else if (percentage > 80) {
    gaugeColorClass = 'yellow';
  }

  return (
    <section className="sidebar-card budget-widget animate-fade-in">
      <h3>Budget Feasibility</h3>
      
      {/* Circular/SVG Budget Gauge */}
      <div className="gauge-container">
        <svg viewBox="0 0 100 55" className="gauge-svg">
          {/* Base Track */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke="#272a31" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          {/* Filled Arc */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={`var(--gauge-${gaugeColorClass})`} 
            strokeWidth="8" 
            strokeLinecap="round"
            strokeDasharray="126"
            strokeDashoffset={strokeDashoffset}
            className="gauge-fill"
          />
        </svg>
        <div className="gauge-label">
          <span className="gauge-percent">{Math.round((totalCost / (budget || 1)) * 100)}%</span>
          <span className="gauge-desc">of budget spent</span>
        </div>
      </div>

      <div className="budget-stats">
        <div className="stat-row">
          <span className="stat-name">Total Estimated Cost</span>
          <span className="stat-val bold">{currencySymbol}{totalCost.toFixed(2)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-name">Your Set Budget</span>
          <span className="stat-val">{currencySymbol}{budget}</span>
        </div>
        <div className="stat-row pt-8 border-t">
          <span className="stat-name">Remaining Cost to Buy</span>
          <span className="stat-val highlight">{currencySymbol}{remainingCostToBuy}</span>
        </div>
      </div>

      {/* Dynamic Feasibility Feedback */}
      <div className={`feasibility-badge ${gaugeColorClass}`}>
        {feasible ? (
          <p>
            🎉 <strong>Within Budget!</strong> You have a margin of {currencySymbol}{margin.toFixed(2)} remaining.
          </p>
        ) : (
          <p>
            ⚠️ <strong>Over Budget by {currencySymbol}{Math.abs(margin).toFixed(2)}!</strong> Consider removing premium items or swapping for recommended substitutions.
          </p>
        )}
      </div>

      {/* Costing Breakdowns */}
      <div className="costing-breakdown">
        <h4>Staple Price Details</h4>
        <div className="cost-list">
          {itemizedCosts.map((item, idx) => (
            <div key={idx} className="cost-item-row">
              <span className="cost-item-name">{item.name}</span>
              <span className="cost-item-price-tag">
                {item.onHand ? (
                  <span className="free-tag">On Hand</span>
                ) : (
                  <>
                    {item.isFallback && (
                      <span 
                        className="fallback-info-trigger" 
                        title="Price estimated using staple standard fallback (not found in database)"
                      >
                        <HelpCircle className="info-icon" />
                      </span>
                    )}
                    {currencySymbol}{item.cost.toFixed(2)}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
