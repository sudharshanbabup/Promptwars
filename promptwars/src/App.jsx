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
import BudgetWidget from './components/BudgetWidget';
import GroceryChecklist from './components/GroceryChecklist';
import SubstitutionsView from './components/SubstitutionsView';
import BatchShortcutsView from './components/BatchShortcutsView';

const STEP_COUNT = 4;

function App() {
  // Config state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showConfig, setShowConfig] = useState(false);

  // Navigation
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');

  // Save API Key
  const handleSaveKey = (key) => {
    setApiKey(key.trim());
    localStorage.setItem('gemini_api_key', key.trim());
    setShowConfig(false);
  };

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
  const [batchPrepTips, setBatchPrepTips] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  // Trigger meal plan generation
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setMealPlan(null);
    setSubstitutions([]);
    setBatchPrepTips([]);
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
  ],
  "batchPrepTips": [
    "Identify when two dishes share a base ingredient or technique, and write a specific tip on how the user can prep them together to save time."
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
      setBatchPrepTips(data.batchPrepTips || []);
      
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
    setBatchPrepTips([]);
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
        
        <div className="header-actions">
          <button 
            onClick={() => setShowConfig(true)} 
            className={`btn-key ${apiKey ? 'active' : ''}`}
          >
            <Key className="btn-icon" />
            {apiKey ? 'Gemini Configured' : 'Configure Gemini Key'}
          </button>
          <div className="header-badge">
            <span className="badge-beta">Production Build</span>
          </div>
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
                <SubstitutionsView substitutions={substitutions} />

                {/* Batch Prep Shortcuts */}
                <BatchShortcutsView batchPrepTips={batchPrepTips} />

              </div>

              {/* Right Column: Interactive Grocery & Budget Feasibility */}
              <div className="right-panel-sidebar">
                
                <BudgetWidget 
                  budgetFeasibility={budgetFeasibility}
                  budget={budget}
                  remainingCostToBuy={remainingCostToBuy}
                  currencySymbol={currencySymbol}
                />

                <GroceryChecklist 
                  editableGroceryList={editableGroceryList}
                  checkedItems={checkedItems}
                  setCheckedItems={setCheckedItems}
                  toggleOnHand={toggleOnHand}
                  deleteGroceryItem={deleteGroceryItem}
                  addGroceryItem={addGroceryItem}
                  remainingCostToBuy={remainingCostToBuy}
                  currencySymbol={currencySymbol}
                />

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Settings Modal */}
      {showConfig && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <Settings className="modal-icon" />
              <h3>Configure Gemini API Key</h3>
            </div>
            
            <div className="modal-body">
              <p className="modal-desc">
                Input your <strong>Gemini API Key</strong> to authenticate calls. Your key is stored safely only in your browser storage (`localStorage`).
              </p>
              
              <div className="key-setup-hint">
                <p>💡 You can get a free key instantly from Google AI Studio:</p>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="studio-link"
                >
                  Open Google AI Studio &rarr;
                </a>
              </div>

              <div className="input-group">
                <label>Gemini API Key</label>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  defaultValue={apiKey}
                  id="api-key-input"
                  className="modal-key-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowConfig(false)} 
                className="btn-cancel"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const val = document.getElementById('api-key-input').value;
                  handleSaveKey(val);
                }} 
                className="btn-save"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="arena-footer">
        <p>MealFlow Cooking Planner &bull; Google Prompt Wars Event Submission</p>
      </footer>
    </div>
  );
}

export default App;
