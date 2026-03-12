import { useState, useEffect, useRef } from "react";

const questions = [
  {
    question: "What is the capital of India?",
    correct_answer: "New Delhi",
    incorrect_answers: ["Mumbai", "Chennai", "Kolkata"],
    category: "Geography",
  },
  {
    question: "Which language runs in the browser?",
    correct_answer: "JavaScript",
    incorrect_answers: ["Python", "Java", "C++"],
    category: "Technology",
  },
  {
    question: "Who developed Java?",
    correct_answer: "James Gosling",
    incorrect_answers: ["Dennis Ritchie", "Guido van Rossum", "Bjarne Stroustrup"],
    category: "Technology",
  },
  {
    question: "HTML stands for?",
    correct_answer: "Hyper Text Markup Language",
    incorrect_answers: ["High Transfer Machine Language", "Home Tool Markup Language", "Hyperlinks Text Management"],
    category: "Technology",
  },
  {
    question: "React is mainly used for?",
    correct_answer: "Building User Interfaces",
    incorrect_answers: ["Database Management", "Server Programming", "Machine Learning"],
    category: "Technology",
  },
];

const TOTAL = questions.length;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getRank(pct) {
  if (pct === 100) return { label: "Perfect Score!", emoji: "🏆", color: "#FFD700" };
  if (pct >= 80) return { label: "Excellent!", emoji: "🌟", color: "#4ade80" };
  if (pct >= 60) return { label: "Good Job!", emoji: "👍", color: "#60a5fa" };
  if (pct >= 40) return { label: "Keep Practicing", emoji: "📚", color: "#f59e0b" };
  return { label: "Don't Give Up!", emoji: "💪", color: "#f87171" };
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0b0f1a;
    --surface: #131929;
    --surface2: #1a2236;
    --border: rgba(99,179,237,0.12);
    --accent: #38bdf8;
    --accent2: #818cf8;
    --gold: #fbbf24;
    --text: #e2e8f0;
    --text-muted: #64748b;
    --green: #4ade80;
    --red: #f87171;
    --radius: 16px;
    --shadow: 0 8px 40px rgba(0,0,0,0.5);
  }

  body {
    font-family: 'Sora', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-wrapper {
    width: 100%;
    min-height: 100vh;
    background:
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(56,189,248,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(129,140,248,0.08) 0%, transparent 60%),
      var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 40px 16px 60px;
  }

  /* HEADER */
  .header {
    text-align: center;
    margin-bottom: 36px;
  }
  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(56,189,248,0.1);
    border: 1px solid rgba(56,189,248,0.25);
    border-radius: 100px;
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header p {
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 15px;
  }

  /* CARD */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 680px;
    overflow: hidden;
    animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes slideUp {
    from { opacity:0; transform: translateY(30px); }
    to   { opacity:1; transform: translateY(0); }
  }

  /* PROGRESS BAR */
  .progress-bar-wrap {
    height: 4px;
    background: var(--surface2);
  }
  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transition: width 0.5s cubic-bezier(.16,1,.3,1);
    border-radius: 0 4px 4px 0;
  }

  /* QUIZ HEADER */
  .quiz-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px 0;
    flex-wrap: wrap;
    gap: 10px;
  }
  .q-counter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--text-muted);
  }
  .q-counter span { color: var(--accent); font-weight: 600; }
  .category-tag {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 100px;
    background: rgba(129,140,248,0.15);
    border: 1px solid rgba(129,140,248,0.3);
    color: var(--accent2);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .score-pill {
    font-size: 13px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: var(--gold);
  }

  /* QUESTION */
  .question-body {
    padding: 28px 28px 20px;
  }
  .question-text {
    font-size: clamp(17px, 3vw, 22px);
    font-weight: 700;
    line-height: 1.45;
    letter-spacing: -0.02em;
  }

  /* OPTIONS */
  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 28px 28px;
  }
  .option-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 18px;
    cursor: pointer;
    color: var(--text);
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    transition: all 0.18s ease;
    position: relative;
    overflow: hidden;
  }
  .option-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(56,189,248,0.06), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .option-btn:hover:not(:disabled)::before { opacity: 1; }
  .option-btn:hover:not(:disabled) {
    border-color: rgba(56,189,248,0.4);
    transform: translateX(4px);
  }
  .option-btn:disabled { cursor: default; }
  .option-btn.correct {
    border-color: var(--green);
    background: rgba(74,222,128,0.1);
    animation: correctPulse 0.4s ease;
  }
  .option-btn.wrong {
    border-color: var(--red);
    background: rgba(248,113,113,0.1);
    animation: shake 0.4s ease;
  }
  .option-btn.dimmed { opacity: 0.4; }

  @keyframes correctPulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.015); }
    100% { transform: scale(1); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25%       { transform: translateX(-6px); }
    75%       { transform: translateX(6px); }
  }

  .option-letter {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .option-btn.correct .option-letter { background: rgba(74,222,128,0.25); color: var(--green); }
  .option-btn.wrong   .option-letter { background: rgba(248,113,113,0.25); color: var(--red); }
  .option-icon { margin-left: auto; font-size: 18px; }

  /* FEEDBACK BAR */
  .feedback-bar {
    margin: 0 28px 20px;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  .feedback-bar.correct { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: var(--green); }
  .feedback-bar.wrong   { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: var(--red); }

  /* NEXT BUTTON */
  .next-btn-wrap { padding: 0 28px 28px; }
  .next-btn {
    width: 100%;
    padding: 15px;
    border-radius: var(--radius);
    border: none;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
    color: #0b0f1a;
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 20px rgba(56,189,248,0.25);
    letter-spacing: 0.01em;
  }
  .next-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(56,189,248,0.35); }
  .next-btn:active { transform: translateY(0); }

  /* RESULTS */
  .results-wrap {
    padding: 48px 32px;
    text-align: center;
    animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
  }
  .score-ring-wrap {
    position: relative;
    width: 160px;
    height: 160px;
    margin: 0 auto 28px;
  }
  .score-ring-wrap svg { transform: rotate(-90deg); }
  .score-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .score-number {
    font-size: 36px;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }
  .score-denom { font-size: 14px; color: var(--text-muted); margin-top: 2px; }
  .rank-label {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 6px;
  }
  .rank-emoji { font-size: 32px; display: block; margin-bottom: 10px; }
  .accuracy-text {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 32px;
  }

  /* ANSWER REVIEW */
  .review-section { margin-bottom: 32px; text-align: left; }
  .review-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .review-item {
    background: var(--surface2);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 8px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border: 1px solid var(--border);
  }
  .review-icon { font-size: 16px; margin-top: 2px; flex-shrink: 0; }
  .review-q { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .review-a { font-size: 12px; color: var(--text-muted); }
  .review-a .correct-ans { color: var(--green); font-weight: 600; }

  /* LEADERBOARD */
  .leaderboard-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 680px;
    padding: 28px;
    margin-top: 20px;
    animation: slideUp 0.6s 0.1s cubic-bezier(.16,1,.3,1) both;
  }
  .lb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .lb-title {
    font-size: 17px;
    font-weight: 700;
  }
  .lb-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.25);
    color: var(--gold);
  }
  .lb-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    margin-bottom: 6px;
    transition: background 0.15s;
  }
  .lb-row:hover { background: var(--surface2); }
  .lb-rank {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    width: 24px;
    text-align: center;
    color: var(--text-muted);
  }
  .lb-rank.top { color: var(--gold); }
  .lb-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }
  .lb-name { font-weight: 600; font-size: 14px; flex: 1; }
  .lb-score-bar-wrap { flex: 1; }
  .lb-score-bar {
    height: 6px;
    border-radius: 100px;
    background: var(--surface2);
    overflow: hidden;
    margin-bottom: 3px;
  }
  .lb-score-bar-fill {
    height: 100%;
    border-radius: 100px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }
  .lb-pct {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-muted);
  }
  .lb-score-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
  }

  /* RESTART */
  .restart-btn {
    width: 100%;
    padding: 15px;
    border-radius: var(--radius);
    border: 1.5px solid rgba(56,189,248,0.3);
    background: transparent;
    color: var(--accent);
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 6px;
  }
  .restart-btn:hover {
    background: rgba(56,189,248,0.08);
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  /* NAME INPUT */
  .name-screen {
    padding: 48px 32px;
    text-align: center;
    animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
  }
  .name-screen h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
  .name-screen p { color: var(--text-muted); font-size: 14px; margin-bottom: 28px; }
  .name-input {
    width: 100%;
    padding: 14px 18px;
    border-radius: var(--radius);
    border: 1.5px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-family: 'Sora', sans-serif;
    font-size: 16px;
    font-weight: 500;
    outline: none;
    margin-bottom: 16px;
    transition: border-color 0.2s;
  }
  .name-input:focus { border-color: rgba(56,189,248,0.5); }
  .name-input::placeholder { color: var(--text-muted); }
`;

const DEMO_LEADERBOARD = [
  { name: "Arjun Sharma", score: 5, color: "#38bdf8", bg: "rgba(56,189,248,0.15)" },
  { name: "Priya Patel", score: 4, color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  { name: "Rohan Mehta", score: 4, color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  { name: "Sneha Rao", score: 3, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { name: "Dev Krishnan", score: 2, color: "#f87171", bg: "rgba(248,113,113,0.15)" },
];

const LETTERS = ["A", "B", "C", "D"];

export default function App() {
  const [phase, setPhase] = useState("name"); // name | quiz | results
  const [playerName, setPlayerName] = useState("");
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [history, setHistory] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [leaderboard, setLeaderboard] = useState(DEMO_LEADERBOARD);

  useEffect(() => {
    if (phase === "quiz") {
      setShuffledOptions(shuffle([...questions[current].incorrect_answers, questions[current].correct_answer]));
      setSelected(null);
      setAnswered(false);
    }
  }, [current, phase]);

  function startQuiz() {
    if (!playerName.trim()) return;
    setPhase("quiz");
    setCurrent(0);
    setScore(0);
    setHistory([]);
  }

  function handleAnswer(opt) {
    if (answered) return;
    const correct = opt === questions[current].correct_answer;
    setSelected(opt);
    setAnswered(true);
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);
    setHistory(h => [...h, { q: questions[current].question, chosen: opt, correct: questions[current].correct_answer, isCorrect: correct }]);
  }

  function handleNext() {
    if (current + 1 < TOTAL) {
      setCurrent(c => c + 1);
    } else {
      const finalScore = history.filter(h => h.isCorrect).length + (selected === questions[current].correct_answer ? 1 : 0);
      const entry = { name: playerName.trim(), score: finalScore, color: "#38bdf8", bg: "rgba(56,189,248,0.15)" };
      setLeaderboard(lb => [...lb, entry].sort((a, b) => b.score - a.score).slice(0, 8));
      setPhase("results");
    }
  }

  function restart() {
    setPhase("name");
    setPlayerName("");
    setCurrent(0);
    setScore(0);
    setHistory([]);
  }

  const q = phase === "quiz" ? questions[current] : null;
  const finalScore = history.filter(h => h.isCorrect).length;
  const pct = Math.round((finalScore / TOTAL) * 100);
  const rank = getRank(pct);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <>
      <style>{styles}</style>
      <div className="app-wrapper">
        {/* HEADER */}
        <div className="header">
          <div className="header-badge">⚡ Student Quiz Platform</div>
          <h1>Test Your Knowledge</h1>
          <p>Challenge yourself. Track your progress. Climb the leaderboard.</p>
        </div>

        {/* NAME SCREEN */}
        {phase === "name" && (
          <div className="card">
            <div className="name-screen">
              <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🎓</span>
              <h2>Ready to Begin?</h2>
              <p>Enter your name to start the quiz and appear on the leaderboard.</p>
              <input
                className="name-input"
                placeholder="Your name..."
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && startQuiz()}
                autoFocus
              />
              <button className="next-btn" onClick={startQuiz} disabled={!playerName.trim()}>
                Start Quiz →
              </button>
            </div>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {phase === "quiz" && q && (
          <div className="card" key={current}>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${((current) / TOTAL) * 100}%` }} />
            </div>
            <div className="quiz-header">
              <span className="q-counter">Question <span>{current + 1}</span> / {TOTAL}</span>
              <span className="category-tag">{q.category}</span>
              <span className="score-pill">⭐ {score} pts</span>
            </div>
            <div className="question-body">
              <p className="question-text">{q.question}</p>
            </div>
            <div className="options-grid">
              {shuffledOptions.map((opt, i) => {
                let cls = "option-btn";
                if (answered) {
                  if (opt === q.correct_answer) cls += " correct";
                  else if (opt === selected) cls += " wrong";
                  else cls += " dimmed";
                }
                return (
                  <button key={i} className={cls} onClick={() => handleAnswer(opt)} disabled={answered}>
                    <span className="option-letter">{LETTERS[i]}</span>
                    {opt}
                    {answered && opt === q.correct_answer && <span className="option-icon">✓</span>}
                    {answered && opt === selected && opt !== q.correct_answer && <span className="option-icon">✗</span>}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={`feedback-bar ${selected === q.correct_answer ? "correct" : "wrong"}`}>
                {selected === q.correct_answer ? "✓" : "✗"}
                {selected === q.correct_answer
                  ? " Correct! Well done."
                  : ` The correct answer is: ${q.correct_answer}`}
              </div>
            )}

            {answered && (
              <div className="next-btn-wrap">
                <button className="next-btn" onClick={handleNext}>
                  {current + 1 < TOTAL ? "Next Question →" : "See Results 🏁"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === "results" && (
          <div className="card">
            <div className="results-wrap">
              <div className="score-ring-wrap">
                <svg width="160" height="160" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={rank.color}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)" }}
                  />
                </svg>
                <div className="score-center">
                  <div className="score-number" style={{ color: rank.color }}>{finalScore}</div>
                  <div className="score-denom">/ {TOTAL}</div>
                </div>
              </div>

              <span className="rank-emoji">{rank.emoji}</span>
              <div className="rank-label" style={{ color: rank.color }}>{rank.label}</div>
              <div className="accuracy-text">{pct}% accuracy · {finalScore} correct out of {TOTAL} questions</div>

              {/* REVIEW */}
              <div className="review-section">
                <div className="review-title">Answer Review</div>
                {history.map((h, i) => (
                  <div className="review-item" key={i}>
                    <div className="review-icon">{h.isCorrect ? "✅" : "❌"}</div>
                    <div>
                      <div className="review-q">{h.q}</div>
                      <div className="review-a">
                        {h.isCorrect
                          ? <span className="correct-ans">✓ {h.correct}</span>
                          : <><span style={{ color: "var(--red)" }}>✗ {h.chosen}</span> &nbsp;→&nbsp; <span className="correct-ans">{h.correct}</span></>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="next-btn" style={{ marginBottom: 10 }} onClick={restart}>
                🔄 Play Again
              </button>
              <button className="restart-btn" onClick={() => {
                document.getElementById("leaderboard-section")?.scrollIntoView({ behavior: "smooth" });
              }}>
                View Leaderboard ↓
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {(phase === "results" || phase === "name") && (
          <div className="leaderboard-card" id="leaderboard-section">
            <div className="lb-header">
              <div className="lb-title">🏆 Leaderboard</div>
              <div className="lb-badge">Top Players</div>
            </div>
            {leaderboard.map((entry, i) => (
              <div className="lb-row" key={i} style={entry.name === playerName && phase === "results" ? { background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 12 } : {}}>
                <div className={`lb-rank ${i < 3 ? "top" : ""}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </div>
                <div className="lb-avatar" style={{ background: entry.bg, color: entry.color }}>
                  {entry.name.charAt(0).toUpperCase()}
                </div>
                <div className="lb-name">
                  {entry.name}
                  {entry.name === playerName && phase === "results" && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>YOU</span>}
                </div>
                <div className="lb-score-bar-wrap">
                  <div className="lb-score-bar">
                    <div className="lb-score-bar-fill" style={{ width: `${(entry.score / TOTAL) * 100}%` }} />
                  </div>
                  <div className="lb-pct">{Math.round((entry.score / TOTAL) * 100)}%</div>
                </div>
                <div className="lb-score-val">{entry.score}/{TOTAL}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
