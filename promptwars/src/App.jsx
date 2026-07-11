import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  ChefHat, 
  Key, 
  Settings, 
  Calendar, 
  Utensils, 
  ShoppingCart, 
  RefreshCw, 
  CheckSquare, 
  AlertTriangle,
  DollarSign,
  Coffee,
  Sun,
  Moon,
  Clock,
  Check,
  Plus,
  Trash2
} from 'lucide-react';

const PRESETS = [
  {
    label: "Super Busy Workday",
    context: "I have back-to-back meetings from 9 AM to 6 PM. I only have 15 minutes to cook per meal, want high energy, and need something easy to clean up."
  },
  {
    label: "Intense Workout Day",
    context: "I am hitting the gym for leg day this afternoon. I need high-protein meals, fast-digesting carbs post-workout, and plenty of hydration."
  },
  {
    label: "Lazy Sunday & Cozy Vibes",
    context: "I am staying in all day, reading books. I want comforting, slow-cooked or warm foods, don't mind spending time cooking, but want a moderate budget."
  }
];

function App() {
  // Configuration
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState('');

  // Form Inputs
  const [dayContext, setDayContext] = useState(PRESETS[0].context);
  const [budgetLimit, setBudgetLimit] = useState('Medium'); // Low, Medium, High
  const [dietary, setDietary] = useState('None'); // None, Vegan, Vegetarian, Gluten-Free, Keto

  // Output States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [mealPlan, setMealPlan] = useState(null);

  // Local interaction states
  const [checkedSteps, setCheckedSteps] = useState({});
  const [checkedGrocery, setCheckedGrocery] = useState({});

  // Toggle checklist items
  const toggleStep = (id) => {
    setCheckedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGrocery = (id) => {
    setCheckedGrocery(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Preset Select
  const selectPreset = (context) => {
    setDayContext(context);
    setMealPlan(null);
    setError('');
  };

  // Run the Meal Planner AI logic
  const generatePlan = async () => {
    if (!apiKey) {
      setShowConfig(true);
      setError('Please configure your Gemini API Key in the top right to generate a plan.');
      return;
    }

    setLoading(true);
    setError('');
    setMealPlan(null);
    setLoadingStep('Analyzing your day & cooking preferences...');

    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = `
You are an expert personal chef and meal planner.
Generate a structured personal cooking plan and to-do list based on the user's day.

User's Day Context:
"${dayContext}"

Budget Level preference: ${budgetLimit}
Dietary constraints: ${dietary}

Create a realistic plan including breakfast, lunch, and dinner. The recipes must strictly fit their schedule and budget.

Provide the response in JSON format matching this schema:
{
  "meals": {
    "breakfast": {
      "name": "Name of breakfast dish",
      "prepTime": "e.g. 10 mins",
      "cookTime": "e.g. 5 mins",
      "description": "Short appetizing description.",
      "instructions": [
        "Step 1 to cook",
        "Step 2 to cook"
      ]
    },
    "lunch": {
      "name": "Name of lunch dish",
      "prepTime": "e.g. 15 mins",
      "cookTime": "e.g. 10 mins",
      "description": "Short description.",
      "instructions": [
        "Step 1",
        "Step 2"
      ]
    },
    "dinner": {
      "name": "Name of dinner dish",
      "prepTime": "e.g. 20 mins",
      "cookTime": "e.g. 20 mins",
      "description": "Short description.",
      "instructions": [
        "Step 1",
        "Step 2"
      ]
    }
  },
  "todoList": [
    {
      "id": "todo_1",
      "task": "e.g. Chop vegetables for lunch ahead of time",
      "time": "Morning (8:00 AM)"
    },
    {
      "id": "todo_2",
      "task": "e.g. Marinate chicken/tofu during lunch break",
      "time": "Afternoon (1:00 PM)"
    }
  ],
  "groceryList": [
    { "item": "Ingredient A", "amount": "e.g. 200g" },
    { "item": "Ingredient B", "amount": "e.g. 2 units" }
  ],
  "substitutions": [
    { "original": "Ingredient A", "alternative": "Vegan/Gluten-Free/Cheaper alternative", "reason": "Why swap it" }
  ],
  "budgetAnalysis": {
    "estimatedCost": "e.g. $15 - $20",
    "feasibility": "Good / Moderate / High",
    "tips": "Tips to save money based on these ingredients."
  }
}
`;

      setLoadingStep('Designing customized menu and recipes...');
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const data = JSON.parse(response.text);
      setMealPlan(data);
      setCheckedSteps({});
      setCheckedGrocery({});
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate plan. Please verify your API key and connection.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="logo-glow">
            <ChefHat className="logo-icon" />
          </div>
          <h1>CHEF PLANNER <span className="badge-beta">TO-DO</span></h1>
        </div>

        <div className="header-actions">
          <button 
            onClick={() => setShowConfig(true)} 
            className={`btn-key ${apiKey ? 'active' : ''}`}
          >
            <Key className="btn-icon" />
            {apiKey ? 'Gemini Configured' : 'Configure Gemini Key'}
          </button>
        </div>
      </header>

      {/* Main Section */}
      <main className="planner-grid">
        
        {/* Left Input Sidebar */}
        <section className="input-card">
          <div className="card-header">
            <Calendar className="header-icon text-glow-green" />
            <h2>Plan Your Day</h2>
          </div>
          
          <div className="input-field-group">
            <label className="field-label">How does your day look?</label>
            <textarea
              value={dayContext}
              onChange={(e) => setDayContext(e.target.value)}
              className="text-input"
              rows="4"
              placeholder="e.g. Busy morning meetings, going to the gym at 5 PM, want a quick high-protein dinner..."
            />
          </div>

          <div className="presets-row">
            {PRESETS.map((p, idx) => (
              <button 
                key={idx} 
                onClick={() => selectPreset(p.context)}
                className="btn-preset"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="selectors-grid">
            <div className="input-field-group">
              <label className="field-label">Budget Range</label>
              <select 
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="select-input"
              >
                <option value="Low">Low (Under $15)</option>
                <option value="Medium">Medium ($15 - $35)</option>
                <option value="High">High (Gourmet / Open)</option>
              </select>
            </div>

            <div className="input-field-group">
              <label className="field-label">Dietary Preference</label>
              <select 
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="select-input"
              >
                <option value="None">No restriction</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Gluten-Free">Gluten-Free</option>
                <option value="Keto">Keto</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <button 
            onClick={generatePlan}
            disabled={loading}
            className={`btn-action ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin btn-icon" />
                <span>{loadingStep}</span>
              </>
            ) : (
              <>
                <ChefHat className="btn-icon" />
                <span>Generate Smart Meal Plan & To-Do List</span>
              </>
            )}
          </button>
        </section>

        {/* Right Output Area */}
        <div className="results-container">
          {mealPlan ? (
            <div className="meal-plan-layout">
              
              {/* Meal Cards */}
              <section className="results-card">
                <div className="card-header">
                  <Utensils className="header-icon text-glow-green" />
                  <h2>Today's Menu</h2>
                </div>

                <div className="meals-grid">
                  {/* Breakfast */}
                  <div className="meal-box">
                    <div className="meal-title-row">
                      <Coffee className="meal-icon text-indigo" />
                      <h3>Breakfast</h3>
                    </div>
                    <h4 className="meal-name">{mealPlan.meals.breakfast.name}</h4>
                    <p className="meal-desc">{mealPlan.meals.breakfast.description}</p>
                    <div className="meal-times">
                      <span>Prep: {mealPlan.meals.breakfast.prepTime}</span>
                      <span>Cook: {mealPlan.meals.breakfast.cookTime}</span>
                    </div>
                    <ul className="meal-steps">
                      {mealPlan.meals.breakfast.instructions.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Lunch */}
                  <div className="meal-box">
                    <div className="meal-title-row">
                      <Sun className="meal-icon text-yellow" />
                      <h3>Lunch</h3>
                    </div>
                    <h4 className="meal-name">{mealPlan.meals.lunch.name}</h4>
                    <p className="meal-desc">{mealPlan.meals.lunch.description}</p>
                    <div className="meal-times">
                      <span>Prep: {mealPlan.meals.lunch.prepTime}</span>
                      <span>Cook: {mealPlan.meals.lunch.cookTime}</span>
                    </div>
                    <ul className="meal-steps">
                      {mealPlan.meals.lunch.instructions.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Dinner */}
                  <div className="meal-box">
                    <div className="meal-title-row">
                      <Moon className="meal-icon text-pink" />
                      <h3>Dinner</h3>
                    </div>
                    <h4 className="meal-name">{mealPlan.meals.dinner.name}</h4>
                    <p className="meal-desc">{mealPlan.meals.dinner.description}</p>
                    <div className="meal-times">
                      <span>Prep: {mealPlan.meals.dinner.prepTime}</span>
                      <span>Cook: {mealPlan.meals.dinner.cookTime}</span>
                    </div>
                    <ul className="meal-steps">
                      {mealPlan.meals.dinner.instructions.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Interactive Cooking To-Do List */}
              <section className="results-card">
                <div className="card-header">
                  <CheckSquare className="header-icon text-glow-green" />
                  <h2>Cooking To-Do List</h2>
                </div>
                <p className="card-subtitle">Complete these preparatory tasks throughout your day to stay on track:</p>
                <div className="todo-list">
                  {mealPlan.todoList.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleStep(item.id)}
                      className={`todo-item ${checkedSteps[item.id] ? 'completed' : ''}`}
                    >
                      <div className="checkbox-box">
                        {checkedSteps[item.id] && <Check className="check-icon" />}
                      </div>
                      <div className="todo-text-block">
                        <span className="todo-task">{item.task}</span>
                        <span className="todo-time">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Grocery & Budget Details */}
              <div className="grocery-budget-row">
                
                {/* Grocery list */}
                <section className="results-card flex-1">
                  <div className="card-header">
                    <ShoppingCart className="header-icon text-glow-green" />
                    <h2>Grocery Checklist</h2>
                  </div>
                  <div className="grocery-list">
                    {mealPlan.groceryList.map((g, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => toggleGrocery(idx)}
                        className={`grocery-item ${checkedGrocery[idx] ? 'completed' : ''}`}
                      >
                        <div className="checkbox-box">
                          {checkedGrocery[idx] && <Check className="check-icon" />}
                        </div>
                        <span className="grocery-name">{g.item}</span>
                        <span className="grocery-amount">{g.amount}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Budget Analysis */}
                <section className="results-card flex-1">
                  <div className="card-header">
                    <DollarSign className="header-icon text-glow-yellow" />
                    <h2>Budget & Feasibility</h2>
                  </div>
                  <div className="budget-container">
                    <div className="budget-metric">
                      <span className="budget-label">Estimated Cost:</span>
                      <span className="budget-value">{mealPlan.budgetAnalysis.estimatedCost}</span>
                    </div>
                    <div className="budget-metric">
                      <span className="budget-label">Feasibility Level:</span>
                      <span className="budget-badge">{mealPlan.budgetAnalysis.feasibility}</span>
                    </div>
                    <div className="budget-tips">
                      <h4>Saving Tips:</h4>
                      <p>{mealPlan.budgetAnalysis.tips}</p>
                    </div>
                  </div>
                </section>

              </div>

              {/* Ingredient Substitutions */}
              <section className="results-card">
                <div className="card-header">
                  <AlertTriangle className="header-icon text-glow-yellow" />
                  <h2>Ingredient Substitutions</h2>
                </div>
                <div className="subs-table-container">
                  <table className="subs-table">
                    <thead>
                      <tr>
                        <th>Original Ingredient</th>
                        <th>Healthy / Cheaper Alternative</th>
                        <th>Reason for Swap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealPlan.substitutions.map((sub, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold">{sub.original}</td>
                          <td className="text-highlight">{sub.alternative}</td>
                          <td className="text-muted-row">{sub.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          ) : (
            <div className="results-empty-state">
              <ChefHat className="large-empty-icon animate-pulse" />
              <h3>Awaiting Your Day's Context</h3>
              <p>Fill out the planning context on the left and hit generate to plan your custom meals, groceries, prep to-dos, and budget analysis!</p>
            </div>
          )}
        </div>

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
        <p>Cooking To-Do List Meal Planner &bull; Google Prompt Wars Event Submission</p>
      </footer>
    </div>
  );
}

export default App;
