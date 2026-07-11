import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  calculateBudgetFeasibility, 
  REFERENCE_PRICES 
} from './budgetLogic';
import { 
  ChefHat, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  Check, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  AlertCircle,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Key,
  Settings
} from 'lucide-react';

const STEP_COUNT = 4;

function App() {
  // Navigation
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');

  // Step 1: Servings & Meals
  const [numPeople, setNumPeople] = useState(2);
  const [mealsSelected, setMealsSelected] = useState(['lunch', 'dinner']);

  // Step 2: Budget & Time
  const [budget, setBudget] = useState(30);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [timeLimit, setTimeLimit] = useState('15-30 min');

  // Step 3: Diet & Cuisine
  const [dietary, setDietary] = useState('None');
  const [customDietary, setCustomDietary] = useState('');
  const [cuisine, setCuisine] = useState('surprise me');

  // Step 4: Pantry Ingredients
  const [onHandRaw, setOnHandRaw] = useState('');

  // Final Output State
  const [mealPlan, setMealPlan] = useState(null);
  
  // Interactive client-side states (for "Swap and See" live editing)
  const [editableGroceryList, setEditableGroceryList] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  // Trigger meal plan generation
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setMealPlan(null);
    setLoadingStep('Planning your recipes...');

    const resolvedDietary = dietary === 'Custom' ? customDietary : dietary;

    try {
      let data;
      try {
        // Try calling the server-side proxy first
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numPeople,
            mealsSelected,
            budget,
            dietary: resolvedDietary,
            timeLimit,
            onHand: onHandRaw,
            cuisine
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server proxy failed.');
        }

        data = await response.json();
      } catch (proxyErr) {
        console.warn("Server-side proxy failed or is not running, trying client-side fallback...", proxyErr);
        
        // Fall back to client-side API execution if the user has configured an API key locally
        if (!apiKey) {
          throw new Error("Local Express server could not be reached, and no browser Gemini API Key is configured. Please set your API key in the top right settings to run client-side.");
        }

        setLoadingStep('Running client-side Gemini fallback...');
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
You are the kernel of a structured meal planning application named MealFlow.
Generate menu recommendations strictly adhering to the specified user constraints.

--- USER CONSTRAINTS ---
- Servings (people): ${numPeople}
- Selected meals: ${mealsSelected.join(', ')}
- Intended maximum budget: ${budget}
- Dietary restrictions: "${resolvedDietary}"
- Cooking time preference (per meal): "${timeLimit}"
- Ingredients already on hand (prioritize using these!): "${onHandRaw}"
- Cuisine style: "${cuisine}"

Format your response strictly as a JSON object matching this schema:
{
  "meals": {
    "breakfast": {
      "name": "Dish Name",
      "prepTime": "10 mins",
      "cookTime": "5 mins",
      "description": "Short appetizing description highlighting if it uses on-hand ingredients.",
      "instructions": ["Step 1", "Step 2"]
    },
    "lunch": {
      "name": "Dish Name",
      "prepTime": "10 mins",
      "cookTime": "10 mins",
      "description": "Short description.",
      "instructions": ["Step 1", "Step 2"]
    },
    "dinner": {
      "name": "Dish Name",
      "prepTime": "15 mins",
      "cookTime": "15 mins",
      "description": "Short description.",
      "instructions": ["Step 1", "Step 2"]
    }
  },
  "groceryList": [
    { "item": "starchy staple/vegetable/protein (match REFERENCE_PRICES key names like egg, milk, bread, chicken, tofu, rice, pasta, tomato, onion, garlic, spinach, cheese, oil, butter, potato, beef, salmon, avocado, beans, yogurt where applicable)", "amount": "e.g. 2 cups / 200g / 4 units", "onHand": false }
  ],
  "substitutions": [
    {
      "original": "Ingredient name",
      "alternative": "Swapped item",
      "reason": "Clear explanation of flavor/texture/nutritional equivalence."
    }
  ]
}

Note: ONLY output values in "meals" for the selected slots (${mealsSelected.join(', ')}). Omit the others.
In the "groceryList", set "onHand" to true for ingredients the user explicitly said they already have on hand.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        data = JSON.parse(response.text);
      }
      
      // Save data to states
      setMealPlan(data.meals);
      setSubstitutions(data.substitutions || []);
      
      // Prep editable grocery list
      const preparedList = (data.groceryList || []).map((item, index) => ({
        id: `g_${index}_${Date.now()}`,
        item: item.item,
        amount: item.amount,
        onHand: !!item.onHand,
        category: getCategoryForItem(item.item)
      }));
      setEditableGroceryList(preparedList);
      setCheckedItems({});
      
      // Scroll to top of plan
      setStep(5);
    } catch (err) {
      console.error(err);
      setError(err.message || 'The AI kitchen is busy. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Crude categorization helper
  const getCategoryForItem = (itemName) => {
    const name = itemName.toLowerCase();
    if (name.includes('chicken') || name.includes('beef') || name.includes('salmon') || name.includes('pork') || name.includes('meat') || name.includes('turkey')) {
      return 'Protein';
    }
    if (name.includes('tomato') || name.includes('onion') || name.includes('garlic') || name.includes('spinach') || name.includes('potato') || name.includes('lettuce') || name.includes('pepper') || name.includes('vegetable')) {
      return 'Produce';
    }
    if (name.includes('milk') || name.includes('cheese') || name.includes('butter') || name.includes('yogurt') || name.includes('cream')) {
      return 'Dairy';
    }
    if (name.includes('rice') || name.includes('pasta') || name.includes('sauce') || name.includes('beans') || name.includes('oil') || name.includes('spice') || name.includes('flour') || name.includes('sugar')) {
      return 'Pantry';
    }
    return 'Other';
  };

  // Live feasibility calculation (Swap & See)
  const budgetFeasibility = useMemo(() => {
    return calculateBudgetFeasibility(editableGroceryList, budget);
  }, [editableGroceryList, budget]);

  // Live "remaining cost to buy" (excluding checked/already bought items)
  const remainingCostToBuy = useMemo(() => {
    let cost = 0;
    budgetFeasibility.itemizedCosts.forEach((item, idx) => {
      const isBought = checkedItems[editableGroceryList[idx]?.id];
      if (!item.onHand && !isBought) {
        cost += item.cost;
      }
    });
    return parseFloat(cost.toFixed(2));
  }, [budgetFeasibility, checkedItems, editableGroceryList]);

  // Handle live toggle onHand status of grocery item
  const toggleOnHand = (id) => {
    setEditableGroceryList(prev => 
      prev.map(item => item.id === id ? { ...item, onHand: !item.onHand } : item)
    );
  };

  // Handle live delete of grocery item
  const deleteGroceryItem = (id) => {
    setEditableGroceryList(prev => prev.filter(item => item.id !== id));
  };

  // Handle live addition of grocery item
  const addGroceryItem = (itemName, amount) => {
    if (!itemName.trim()) return;
    const newItem = {
      id: `g_added_${Date.now()}`,
      item: itemName.trim(),
      amount: amount.trim() || '1 unit',
      onHand: false,
      category: getCategoryForItem(itemName)
    };
    setEditableGroceryList(prev => [...prev, newItem]);
  };

  // Reset/Restart planner
  const handleReset = () => {
    setStep(1);
    setMealPlan(null);
    setEditableGroceryList([]);
    setSubstitutions([]);
    setCheckedItems({});
    setError('');
  };

  return (
    <div className="app-container">
      {/* Brand Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="logo-glow">
            <ChefHat className="logo-icon" />
          </div>
          <h1>MealFlow</h1>
        </div>
        <div className="header-badge">
          <span className="badge-beta">Production Build</span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="main-content-layout">
        
        {/* Step-by-Step Guided Wizard */}
        {step <= STEP_COUNT && (
          <div className="wizard-card animate-fade-in">
            {/* Step Indicators */}
            <div className="wizard-progress">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <div 
                  key={i} 
                  className={`progress-dot ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}
                >
                  {step > i + 1 ? <Check className="progress-check" /> : i + 1}
                </div>
              ))}
              <div className="progress-track" style={{ width: `${((step - 1) / (STEP_COUNT - 1)) * 100}%` }}></div>
            </div>

            {/* Step 1: Servings & Meal Selection */}
            {step === 1 && (
              <div className="step-container">
                <h2>Plan Your Meals</h2>
                <p className="step-desc">First, tell us who you are cooking for and which meals you need today.</p>
                
                <div className="input-group">
                  <label className="field-label">Number of People Eating: <span className="highlight-val">{numPeople}</span></label>
                  <div className="stepper">
                    <button onClick={() => setNumPeople(p => Math.max(1, p - 1))} className="btn-stepper">-</button>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      value={numPeople} 
                      onChange={(e) => setNumPeople(Math.max(1, parseInt(e.target.value) || 1))}
                      className="stepper-input"
                    />
                    <button onClick={() => setNumPeople(p => Math.min(20, p + 1))} className="btn-stepper">+</button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="field-label">Meals Needed Today:</label>
                  <div className="checkbox-options-grid">
                    {['breakfast', 'lunch', 'dinner'].map(meal => (
                      <label key={meal} className={`checkbox-card ${mealsSelected.includes(meal) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={mealsSelected.includes(meal)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMealsSelected(prev => [...prev, meal]);
                            } else {
                              setMealsSelected(prev => prev.filter(m => m !== meal));
                            }
                          }}
                        />
                        <span className="checkbox-title">{meal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Budget & Time Limit */}
            {step === 2 && (
              <div className="step-container">
                <h2>Budget & Cooking Time</h2>
                <p className="step-desc">How much budget do you have, and how fast do you need the meals ready?</p>
                
                <div className="input-group">
                  <label className="field-label">Daily Budget Limit:</label>
                  <div className="budget-input-wrapper">
                    <select 
                      value={currencySymbol} 
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="currency-select"
                    >
                      <option value="$">$</option>
                      <option value="€">€</option>
                      <option value="£">£</option>
                    </select>
                    <input 
                      type="number" 
                      min="1" 
                      max="1000"
                      value={budget} 
                      onChange={(e) => setBudget(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="budget-number-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="field-label">Cooking Time Available (Per Meal):</label>
                  <div className="radio-options-grid">
                    {['under 15 min', '15-30 min', 'no limit'].map(time => (
                      <label key={time} className={`radio-card ${timeLimit === time ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="timeLimit" 
                          checked={timeLimit === time}
                          onChange={() => setTimeLimit(time)}
                        />
                        <span>{time}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Diet & Cuisine */}
            {step === 3 && (
              <div className="step-container">
                <h2>Dietary Guidelines & Cuisine</h2>
                <p className="step-desc">Help us filter out unwanted ingredients and select a food style.</p>

                <div className="input-group">
                  <label className="field-label">Dietary Constraint:</label>
                  <select 
                    value={dietary} 
                    onChange={(e) => setDietary(e.target.value)}
                    className="dropdown-input"
                  >
                    <option value="None">None</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                    <option value="Nut-Free">Nut-Free</option>
                    <option value="Custom">Custom Constraints...</option>
                  </select>
                </div>

                {dietary === 'Custom' && (
                  <div className="input-group animate-fade-in">
                    <label className="field-label">Describe your dietary rules:</label>
                    <input 
                      type="text" 
                      value={customDietary} 
                      onChange={(e) => setCustomDietary(e.target.value)}
                      placeholder="e.g. Dairy-free, low sodium, no mushrooms..."
                      className="text-input-field"
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="field-label">Cuisine Style Preference:</label>
                  <input 
                    type="text" 
                    value={cuisine} 
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="e.g. Italian, Mexican, Mediterranean, or 'surprise me'"
                    className="text-input-field"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Pantry Check */}
            {step === 4 && (
              <div className="step-container">
                <h2>What's in your pantry?</h2>
                <p className="step-desc">List ingredients you already have. We'll prioritize using these up first to reduce shopping cost!</p>

                <div className="input-group">
                  <label className="field-label">Ingredients on hand (comma separated):</label>
                  <textarea 
                    value={onHandRaw} 
                    onChange={(e) => setOnHandRaw(e.target.value)}
                    placeholder="e.g. eggs, rice, olive oil, onion, garlic, pasta..."
                    rows="4"
                    className="textarea-input-field"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="wizard-actions">
              {step > 1 ? (
                <button onClick={() => setStep(s => s - 1)} className="btn-back">
                  <ChevronLeft className="btn-icon" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {step < STEP_COUNT ? (
                <button 
                  onClick={() => setStep(s => s + 1)} 
                  disabled={step === 1 && mealsSelected.length === 0}
                  className="btn-next"
                >
                  <span>Continue</span>
                  <ChevronRight className="btn-icon" />
                </button>
              ) : (
                <button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="btn-finish"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin btn-icon" />
                      <span>Generating Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="btn-icon" />
                      <span>Build My Cooking Plan</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-card">
            <RefreshCw className="animate-spin large-loading-icon" />
            <h3>{loadingStep}</h3>
            <p>Gathering fresh ingredients, calculating grocery prices, and tailoring to your day.</p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="error-panel animate-fade-in">
            <AlertCircle className="error-icon" />
            <div className="error-details">
              <h4>Something went wrong</h4>
              <p>{error}</p>
              <button onClick={handleReset} className="btn-retry">Start Over</button>
            </div>
          </div>
        )}

        {/* Output Presentation Layout */}
        {step === 5 && mealPlan && (
          <div className="output-layout animate-fade-in">
            
            {/* Top Stats Banner */}
            <div className="results-header-banner">
              <h2>Your Custom Meal Plan</h2>
              <button onClick={handleReset} className="btn-reset-top">
                <RefreshCw className="btn-icon" />
                <span>Start New Plan</span>
              </button>
            </div>

            {/* Split screen: Left Side Plan & Right Side Live Budget Panel */}
            <div className="grid-split-layout">
              
              {/* Left Column: Meal Cards */}
              <div className="left-panel-flow">
                
                {/* Meal Cards */}
                <section className="plan-card">
                  <div className="section-title-row">
                    <ShoppingBag className="title-icon green" />
                    <h3>Daily Recipes</h3>
                  </div>
                  
                  <div className="meals-vertical-stack">
                    {Object.keys(mealPlan).map((mealKey) => {
                      const meal = mealPlan[mealKey];
                      return (
                        <div key={mealKey} className="meal-result-box">
                          <div className="meal-result-hdr">
                            <span className="meal-tag">{mealKey}</span>
                            <span className="meal-time"><Clock className="time-icon" /> {meal.prepTime} prep / {meal.cookTime} cook</span>
                          </div>
                          <h4>{meal.name}</h4>
                          <p className="meal-desc">{meal.description}</p>
                          
                          <div className="meal-instructions-box">
                            <h5>Preparation Steps:</h5>
                            <ol>
                              {meal.instructions.map((step, sIdx) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Substitutions */}
                {substitutions.length > 0 && (
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
                )}

              </div>

              {/* Right Column: Interactive Grocery & Budget Feasibility */}
              <div className="right-panel-sidebar">
                
                {/* Live Cost & Budget Meter */}
                <section className="sidebar-card budget-widget">
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
                      {/* Live Value Track */}
                      <path 
                        d="M 10 50 A 40 40 0 0 1 90 50" 
                        fill="none" 
                        stroke={
                          budgetFeasibility.status === 'Over budget' ? '#f87171' : 
                          budgetFeasibility.status === 'On budget' ? '#fbbf24' : '#34d399'
                        } 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        strokeDasharray={126}
                        strokeDashoffset={Math.max(0, 126 - (126 * Math.min(1, budgetFeasibility.totalBuyCost / budget)))}
                        className="gauge-progress-path"
                      />
                    </svg>
                    
                    <div className="gauge-overlay-labels">
                      <span className="gauge-cost">{currencySymbol}{budgetFeasibility.totalBuyCost.toFixed(2)}</span>
                      <span className="gauge-max">of {currencySymbol}{budget} limit</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className={`status-pill ${budgetFeasibility.status.toLowerCase().replace(' ', '-')}`}>
                    <span>{budgetFeasibility.status}</span>
                  </div>
                  
                  <p className="feasibility-desc">{budgetFeasibility.description}</p>

                  {/* Math Breakdown */}
                  <div className="math-breakdown-box">
                    <div className="math-row">
                      <span>Shopping List Cost:</span>
                      <span>{currencySymbol}{budgetFeasibility.totalBuyCost.toFixed(2)}</span>
                    </div>
                    <div className="math-row">
                      <span>Value from Pantry:</span>
                      <span className="green-text">+{currencySymbol}{budgetFeasibility.totalHaveCost.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Swap Suggestion Tip */}
                  {budgetFeasibility.suggestedSwaps.length > 0 && (
                    <div className="savings-suggestions-card">
                      <h4>💡 Over-Budget Swaps to Fix:</h4>
                      <ul>
                        {budgetFeasibility.suggestedSwaps.map((swap, idx) => (
                          <li key={idx}>
                            {swap.tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {/* Interactive Grocery Checklist */}
                <section className="sidebar-card grocery-checklist-widget">
                  <div className="checklist-hdr-row">
                    <h3>Grocery List</h3>
                    <span className="cost-counter-badge">
                      {currencySymbol}{remainingCostToBuy} remaining
                    </span>
                  </div>
                  
                  {/* Live Add Item */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const nameInput = e.target.elements.gName;
                      const amtInput = e.target.elements.gAmt;
                      addGroceryItem(nameInput.value, amtInput.value);
                      nameInput.value = '';
                      amtInput.value = '';
                    }}
                    className="add-grocery-form"
                  >
                    <input name="gName" type="text" placeholder="Add ingredient..." required className="add-input" />
                    <input name="gAmt" type="text" placeholder="Qty" className="add-qty-input" />
                    <button type="submit" className="btn-add-item"><Plus className="add-icon" /></button>
                  </form>

                  {/* Categorized Grocery List */}
                  <div className="grocery-categories-stack">
                    {['Produce', 'Protein', 'Dairy', 'Pantry', 'Other'].map(cat => {
                      const itemsInCat = editableGroceryList.filter(item => item.category === cat);
                      if (itemsInCat.length === 0) return null;
                      
                      return (
                        <div key={cat} className="grocery-category-group">
                          <h4>{cat}</h4>
                          <div className="category-items-list">
                            {itemsInCat.map((item) => {
                              const isChecked = !!checkedItems[item.id];
                              
                              return (
                                <div key={item.id} className={`grocery-row-item ${isChecked ? 'checked' : ''} ${item.onHand ? 'pantry-have' : ''}`}>
                                  {/* Strike-off Checkbox */}
                                  <label className="checkbox-label-container">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      disabled={item.onHand}
                                    />
                                    <span className="custom-checkmark"></span>
                                  </label>

                                  <div className="grocery-item-details">
                                    <span className="grocery-item-name">{item.item}</span>
                                    <span className="grocery-item-amount">{item.amount}</span>
                                  </div>

                                  {/* On Hand status badge */}
                                  <button 
                                    onClick={() => toggleOnHand(item.id)} 
                                    className={`btn-pantry-toggle ${item.onHand ? 'have' : 'need'}`}
                                    title={item.onHand ? "I already have this in my pantry" : "I need to purchase this"}
                                  >
                                    {item.onHand ? 'have it' : 'need to buy'}
                                  </button>

                                  {/* Delete button */}
                                  <button onClick={() => deleteGroceryItem(item.id)} className="btn-delete-grocery">
                                    <Trash2 className="trash-icon" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default App;
