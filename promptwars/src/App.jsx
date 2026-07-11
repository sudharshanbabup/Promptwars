import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Swords, 
  Key, 
  Settings, 
  Sparkles, 
  HelpCircle, 
  Award, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  MessageSquareCode, 
  Trash2,
  Lock
} from 'lucide-react';

const PRESETS = [
  {
    name: "Explain Recursion (Wizard vs. Scientist)",
    challenge: "Explain the concept of recursion to a 10-year-old child.",
    promptA: {
      system: "You are Merlin the wizard. You explain complex programming topics using analogies of magic, spells, potions, and enchanted castles. Keep your language whimsical and magical.",
      user: "Merlin, please explain what 'recursion' is to a young apprentice."
    },
    promptB: {
      system: "You are a professional science communicator who writes books for kids. You explain concepts using simple, clear, real-world examples, diagrams, and step-by-step logic without jargon.",
      user: "Explain the concept of recursion to a 10-year-old using a real-world example."
    }
  },
  {
    name: "AI Startup Slogan (Hype vs. Minimalist)",
    challenge: "Generate a tagline/slogan for a new AI startup that helps developers write tests automatically.",
    promptA: {
      system: "You are an aggressive tech-startup marketing guru. Use hype words, bold claims, high energy, and emojis. Make it sound revolutionary and fast-paced.",
      user: "Write 3 slogans for my AI-testing startup."
    },
    promptB: {
      system: "You are a minimalist copywriter who believes in simplicity, clarity, and understatement. Avoid jargon, hype, and exclamation marks. Focus on direct utility and peace of mind.",
      user: "Write 3 slogans for my AI-testing startup."
    }
  },
  {
    name: "Refactor Python Code (Performance vs. Readability)",
    challenge: "Refactor a nested loop function to find prime numbers to make it better.",
    promptA: {
      system: "You are a hardcore competitive programmer who prioritizes raw performance, micro-optimizations, bitwise operations, and minimal lines of code. Explain your performance tricks.",
      user: "Optimize a basic prime finding function in Python."
    },
    promptB: {
      system: "You are a software architect who prioritizes clean code principles, readability, descriptive variable names, docstrings, and comprehensive inline comments. Make it maintainable.",
      user: "Refactor a basic prime finding function in Python."
    }
  }
];

function App() {
  // Config state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Battle states
  const [challenge, setChallenge] = useState(PRESETS[0].challenge);
  
  // Prompt A states
  const [modelA, setModelA] = useState('gemini-2.5-flash');
  const [tempA, setTempA] = useState(0.7);
  const [systemA, setSystemA] = useState(PRESETS[0].promptA.system);
  const [userA, setUserA] = useState(PRESETS[0].promptA.user);
  
  // Prompt B states
  const [modelB, setModelB] = useState('gemini-2.5-flash');
  const [tempB, setTempB] = useState(0.7);
  const [systemB, setSystemB] = useState(PRESETS[0].promptB.system);
  const [userB, setUserB] = useState(PRESETS[0].promptB.user);

  // Output/Status states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  // Handle Preset change
  const applyPreset = (index) => {
    setSelectedPreset(index);
    const preset = PRESETS[index];
    setChallenge(preset.challenge);
    setSystemA(preset.promptA.system);
    setUserA(preset.promptA.user);
    setSystemB(preset.promptB.system);
    setUserB(preset.promptB.user);
    setOutputA('');
    setOutputB('');
    setVerdict(null);
    setError('');
  };

  // Save API Key
  const handleSaveKey = (key) => {
    setApiKey(key.trim());
    localStorage.setItem('gemini_api_key', key.trim());
    setShowConfig(false);
  };

  // Run the battle
  const runBattle = async () => {
    if (!apiKey) {
      setShowConfig(true);
      setError('Please add a Gemini API Key to run battles.');
      return;
    }

    setLoading(true);
    setError('');
    setVerdict(null);
    setOutputA('');
    setOutputB('');

    const ai = new GoogleGenAI({ apiKey });

    try {
      // Step 1: Run Prompt A
      setLoadingStep('Summoning Player A...');
      const responseA = await ai.models.generateContent({
        model: modelA,
        contents: userA,
        config: {
          systemInstruction: systemA || undefined,
          temperature: tempA,
        }
      });
      const textA = responseA.text;
      setOutputA(textA);

      // Step 2: Run Prompt B
      setLoadingStep('Summoning Player B...');
      const responseB = await ai.models.generateContent({
        model: modelB,
        contents: userB,
        config: {
          systemInstruction: systemB || undefined,
          temperature: tempB,
        }
      });
      const textB = responseB.text;
      setOutputB(textB);

      // Step 3: Run AI Referee
      setLoadingStep('AI Referee evaluating submissions...');
      
      const refereePrompt = `
You are an expert AI Prompt Engineer and Judge. You are refereeing a "Prompt Battle".
Your task is to analyze the performance of two different prompts (Prompt A and Prompt B) that were run against a specific Challenge.

Here is the Challenge:
"${challenge}"

--- PLAYER A CONFIG ---
System Instruction: "${systemA}"
User Query: "${userA}"
Generated Response A:
"""
${textA}
"""

--- PLAYER B CONFIG ---
System Instruction: "${systemB}"
User Query: "${userB}"
Generated Response B:
"""
${textB}
"""

Evaluate both outputs rigorously across these criteria:
1. Creativity (Score 0-100)
2. Relevance to Challenge (Score 0-100)
3. Clarity and Execution (Score 0-100)
4. Overall Quality (Score 0-100)

Provide your response in JSON format exactly like this:
{
  "scores": {
    "promptA": {
      "creativity": 85,
      "relevance": 90,
      "clarity": 80,
      "overall": 85
    },
    "promptB": {
      "creativity": 90,
      "relevance": 95,
      "clarity": 90,
      "overall": 92
    }
  },
  "verdict": "Player A" or "Player B" or "Draw",
  "reasoning": "Detailed justification on why the winner won, comparing specific stylistic choices, structure, and effectiveness.",
  "critiqueA": "Constructive feedback for Prompt A.",
  "critiqueB": "Constructive feedback for Prompt B."
}
`;

      const refereeResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: refereePrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const refereeResult = JSON.parse(refereeResponse.text);
      setVerdict(refereeResult);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during the battle.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="logo-glow">
            <Swords className="logo-icon" />
          </div>
          <h1>PROMPT WARS <span className="badge-beta">ARENA</span></h1>
        </div>

        <div className="header-actions">
          {/* Preset Selector */}
          <div className="preset-selector">
            <span className="preset-label">Battle Preset:</span>
            <select 
              value={selectedPreset} 
              onChange={(e) => applyPreset(Number(e.target.value))}
              className="preset-select"
            >
              {PRESETS.map((preset, idx) => (
                <option key={idx} value={idx}>{preset.name}</option>
              ))}
            </select>
          </div>

          {/* Key Button */}
          <button 
            onClick={() => setShowConfig(true)} 
            className={`btn-key ${apiKey ? 'active' : ''}`}
          >
            <Key className="btn-icon" />
            {apiKey ? 'API Key Configured' : 'Configure API Key'}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="arena-grid">
        
        {/* Challenge Section */}
        <section className="challenge-card">
          <div className="card-header">
            <Sparkles className="challenge-icon text-glow-yellow" />
            <h2>The Challenge Criteria</h2>
          </div>
          <p className="card-subtitle">Define the goal that both prompts are competing to achieve:</p>
          <textarea
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            className="challenge-input"
            rows="2"
            placeholder="e.g. Write a humorous marketing email introducing a smart toaster."
          />
        </section>

        {/* The Combatants */}
        <div className="fighters-row">
          
          {/* Fighter A Panel */}
          <section className="fighter-panel fighter-a">
            <div className="panel-header indigo-glow">
              <span className="badge fighter-badge-a">PLAYER A</span>
              <div className="model-config">
                <select 
                  value={modelA} 
                  onChange={(e) => setModelA(e.target.value)}
                  className="model-select"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </select>
                <div className="temp-slider">
                  <span>Temp: {tempA}</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="0.1" 
                    value={tempA} 
                    onChange={(e) => setTempA(Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>

            <div className="editor-group">
              <label>System Instruction (Persona/Rules)</label>
              <textarea
                value={systemA}
                onChange={(e) => setSystemA(e.target.value)}
                placeholder="Set background rules, persona or tone constraints..."
                rows="3"
                className="code-textarea"
              />
            </div>

            <div className="editor-group">
              <label>User Query / Prompt</label>
              <textarea
                value={userA}
                onChange={(e) => setUserA(e.target.value)}
                placeholder="What user query is sent to the model..."
                rows="4"
                className="code-textarea highlighted"
              />
            </div>

            <div className="output-preview">
              <div className="preview-label">Submission Output A</div>
              <div className="preview-content">
                {outputA ? (
                  <pre>{outputA}</pre>
                ) : (
                  <div className="empty-state">Waiting for battle to start...</div>
                )}
              </div>
            </div>
          </section>

          {/* Fighter B Panel */}
          <section className="fighter-panel fighter-b">
            <div className="panel-header pink-glow">
              <span className="badge fighter-badge-b">PLAYER B</span>
              <div className="model-config">
                <select 
                  value={modelB} 
                  onChange={(e) => setModelB(e.target.value)}
                  className="model-select"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </select>
                <div className="temp-slider">
                  <span>Temp: {tempB}</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="0.1" 
                    value={tempB} 
                    onChange={(e) => setTempB(Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>

            <div className="editor-group">
              <label>System Instruction (Persona/Rules)</label>
              <textarea
                value={systemB}
                onChange={(e) => setSystemB(e.target.value)}
                placeholder="Set background rules, persona or tone constraints..."
                rows="3"
                className="code-textarea"
              />
            </div>

            <div className="editor-group">
              <label>User Query / Prompt</label>
              <textarea
                value={userB}
                onChange={(e) => setUserB(e.target.value)}
                placeholder="What user query is sent to the model..."
                rows="4"
                className="code-textarea highlighted"
              />
            </div>

            <div className="output-preview">
              <div className="preview-label">Submission Output B</div>
              <div className="preview-content">
                {outputB ? (
                  <pre>{outputB}</pre>
                ) : (
                  <div className="empty-state">Waiting for battle to start...</div>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="action-row">
          <button 
            onClick={runBattle} 
            disabled={loading} 
            className={`btn-battle ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin btn-icon" />
                <span>{loadingStep}</span>
              </>
            ) : (
              <>
                <Swords className="btn-icon" />
                <span>INITIATE PROMPT BATTLE</span>
              </>
            )}
          </button>
        </div>

        {/* Referee Verdict Panel */}
        {verdict && (
          <section className="verdict-card">
            <div className="verdict-banner">
              <Award className="verdict-crown-icon animate-pulse" />
              <h2>AI Referee Verdict</h2>
            </div>
            
            <div className="verdict-main-box">
              <div className="winner-announcement">
                <span className="winner-label">Winner:</span>
                <span className={`winner-name ${verdict.verdict.toLowerCase().replace(' ', '-')}`}>
                  {verdict.verdict}
                </span>
              </div>
              <p className="verdict-reasoning">
                <strong>Justification:</strong> {verdict.reasoning}
              </p>
            </div>

            {/* Criteria Breakdown Grid */}
            <div className="scores-table-container">
              <table className="scores-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="player-col player-a-col">Player A</th>
                    <th className="player-col player-b-col">Player B</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Creativity</td>
                    <td className="score-val">{verdict.scores.promptA.creativity}/100</td>
                    <td className="score-val">{verdict.scores.promptB.creativity}/100</td>
                  </tr>
                  <tr>
                    <td>Relevance</td>
                    <td className="score-val">{verdict.scores.promptA.relevance}/100</td>
                    <td className="score-val">{verdict.scores.promptB.relevance}/100</td>
                  </tr>
                  <tr>
                    <td>Clarity & Execution</td>
                    <td className="score-val">{verdict.scores.promptA.clarity}/100</td>
                    <td className="score-val">{verdict.scores.promptB.clarity}/100</td>
                  </tr>
                  <tr className="overall-row">
                    <td>Overall Score</td>
                    <td className="score-val overall-score-a">{verdict.scores.promptA.overall}/100</td>
                    <td className="score-val overall-score-b">{verdict.scores.promptB.overall}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Critiques */}
            <div className="critique-columns">
              <div className="critique-box critique-a">
                <h3>Coach Critique for A</h3>
                <p>{verdict.critiqueA}</p>
              </div>
              <div className="critique-box critique-b">
                <h3>Coach Critique for B</h3>
                <p>{verdict.critiqueB}</p>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Key Config Modal */}
      {showConfig && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <Settings className="modal-icon" />
              <h3>Gemini API Configuration</h3>
            </div>
            
            <div className="modal-body">
              <p className="modal-desc">
                Enter your <strong>Gemini API Key</strong> to authenticate your prompts directly in the browser. 
                Your key is stored safely only in your local browser storage (`localStorage`).
              </p>
              
              <div className="key-setup-hint">
                <p>💡 <strong>Don't have a key?</strong> You can get a free key in 10 seconds from Google AI Studio:</p>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="studio-link"
                >
                  Get Key from Google AI Studio &rarr;
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
        <p>Google Prompt Wars Event &bull; Scaffolded with love by Antigravity</p>
      </footer>
    </div>
  );
}

export default App;
