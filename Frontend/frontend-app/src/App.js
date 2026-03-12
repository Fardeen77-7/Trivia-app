import { useState, useEffect, useCallback, useRef } from "react";

// ─── Persistent storage helpers (acts as MongoDB) ─────────────────────────────
async function dbGet(key) {
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function dbSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), true); } catch(e) { console.error(e); }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMER = 15;
const AVATARS = ["🦊","🐯","🦁","🐸","🦋","🐙","🦄","🐉","🤖","👾","🎭","🔥"];
const OPTION_COLORS = ["#FF4757","#1E90FF","#2ED573","#FFA502"];
const OPTION_SHAPES = ["▲","◆","●","■"];

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }
function decode(s) {
  try { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }
  catch { return s; }
}
function getRank(p) {
  if (p===100) return {label:"LEGENDARY", emoji:"🏆", color:"#FFD700"};
  if (p>=80)   return {label:"EXCELLENT", emoji:"🌟", color:"#2ED573"};
  if (p>=60)   return {label:"GREAT",     emoji:"👍", color:"#1E90FF"};
  if (p>=40)   return {label:"OKAY",      emoji:"📚", color:"#FFA502"};
  return              {label:"TRY AGAIN", emoji:"💪", color:"#FF4757"};
}
function timeBonus(t) { return Math.floor((t / TIMER) * 500); }

// ─── Fake online players (simulated multiplayer) ──────────────────────────────
const FAKE_PLAYERS = [
  {name:"Arjun_S", avatar:"🐯"}, {name:"Priya_P", avatar:"🦄"},
  {name:"Rohan_M", avatar:"🐉"}, {name:"Sneha_R", avatar:"🦋"},
  {name:"Dev_K",   avatar:"🤖"}, {name:"Ananya_V",avatar:"🦁"},
];

export default function KahootQuiz() {
  // ── Phase: splash | login | lobby | quiz | results ─────────────────────────
  const [phase,       setPhase]       = useState("splash");
  const [authMode,    setAuthMode]    = useState("login"); // login | signup
  const [user,        setUser]        = useState(null);
  const [authError,   setAuthError]   = useState("");
  const [loginForm,   setLoginForm]   = useState({username:"", password:"", avatar: AVATARS[0]});

  // Quiz state
  const [questions,   setQuestions]   = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [score,       setScore]       = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(TIMER);
  const [selected,    setSelected]    = useState(null);
  const [answered,    setAnswered]    = useState(false);
  const [history,     setHistory]     = useState([]);
  const [opts,        setOpts]        = useState([]);
  const [streak,      setStreak]      = useState(0);
  const [fakeScores,  setFakeScores]  = useState({});
  const [showStreak,  setShowStreak]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [loadErr,     setLoadErr]     = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading,   setLbLoading]   = useState(false);

  const TOTAL = questions.length;
  const q     = questions[current];

  // ── Load leaderboard from storage ─────────────────────────────────────────
  async function loadLeaderboard() {
    setLbLoading(true);
    const lb = await dbGet("kahoot:leaderboard") || [];
    setLeaderboard(lb);
    setLbLoading(false);
  }

  async function saveScore(username, avatar, finalScore, total) {
    const lb = await dbGet("kahoot:leaderboard") || [];
    const pct = Math.round((finalScore/total)*100);
    const existing = lb.findIndex(e => e.username === username);
    const entry = { username, avatar, score: finalScore, total, pct, date: new Date().toLocaleDateString() };
    if (existing >= 0) {
      if (finalScore > lb[existing].score) lb[existing] = entry;
    } else {
      lb.push(entry);
    }
    lb.sort((a,b) => b.score - a.score);
    const top = lb.slice(0,20);
    await dbSet("kahoot:leaderboard", top);
    return top;
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  async function handleAuth() {
    setAuthError("");
    const {username, password, avatar} = loginForm;
    if (!username.trim() || !password.trim()) { setAuthError("All fields required"); return; }
    if (username.trim().length < 3) { setAuthError("Username must be 3+ chars"); return; }
    if (password.length < 4) { setAuthError("Password must be 4+ chars"); return; }

    const users = await dbGet("kahoot:users") || {};

    if (authMode === "signup") {
      if (users[username]) { setAuthError("Username already taken!"); return; }
      users[username] = { password, avatar };
      await dbSet("kahoot:users", users);
      setUser({ username, avatar });
      setPhase("lobby");
    } else {
      if (!users[username]) { setAuthError("User not found. Sign up first!"); return; }
      if (users[username].password !== password) { setAuthError("Wrong password!"); return; }
      setUser({ username, avatar: users[username].avatar });
      setPhase("lobby");
    }
    await loadLeaderboard();
  }

  // ── Fetch questions ────────────────────────────────────────────────────────
  async function fetchQuestions() {
    setLoading(true); setLoadErr(false);
    try {
      const res  = await fetch("https://opentdb.com/api.php?amount=10&type=multiple");
      const data = await res.json();
      if (!data.results?.length) throw new Error();
      const fmt = data.results.map(q => ({
        question:          decode(q.question),
        correct_answer:    decode(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(decode),
        category:          decode(q.category),
        difficulty:        q.difficulty,
      }));
      setQuestions(fmt);
      // init fake player scores
      const fs = {};
      FAKE_PLAYERS.forEach(p => { fs[p.name] = 0; });
      setFakeScores(fs);
      setLoading(false);
      return fmt;
    } catch {
      setLoadErr(true);
      setLoading(false);
      return null;
    }
  }

  async function startGame() {
    setCurrent(0); setScore(0); setHistory([]); setStreak(0);
    const qs = await fetchQuestions();
    if (qs) setPhase("quiz");
  }

  // ── Shuffle options on question change ────────────────────────────────────
  useEffect(() => {
    if (phase === "quiz" && q) {
      setOpts(shuffle([...q.incorrect_answers, q.correct_answer]));
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIMER);
    }
  }, [current, phase]);

  // ── Advance question ───────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setCurrent(c => {
      if (c + 1 < TOTAL) return c + 1;
      setPhase("results");
      return c;
    });
  }, [TOTAL]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz" || answered) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          setAnswered(true);
          setHistory(h => [...h, { q: q?.question, chosen: null, correct: q?.correct_answer, isCorrect: false }]);
          setStreak(0);
          setTimeout(() => advance(), 1200);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [current, phase, answered, advance]);

  // ── Fake players answer randomly ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz" || !q) return;
    const delays = FAKE_PLAYERS.map(p => ({
      player: p.name,
      delay: Math.random() * 8000 + 2000,
      correct: Math.random() > 0.45,
    }));
    const timers = delays.map(({ player, delay, correct }) =>
      setTimeout(() => {
        setFakeScores(prev => ({
          ...prev,
          [player]: prev[player] + (correct ? Math.floor(Math.random() * 800 + 200) : 0),
        }));
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [current, phase]);

  // ── Handle answer ──────────────────────────────────────────────────────────
  function handleAnswer(opt) {
    if (answered) return;
    const correct = opt === q.correct_answer;
    const bonus = correct ? 500 + timeBonus(timeLeft) + (streak >= 2 ? 200 : 0) : 0;
    setSelected(opt);
    setAnswered(true);
    if (correct) {
      setScore(s => s + bonus);
      setStreak(s => s + 1);
      if (streak + 1 >= 2) { setShowStreak(true); setTimeout(() => setShowStreak(false), 1500); }
    } else {
      setStreak(0);
    }
    setHistory(h => [...h, { q: q.question, chosen: opt, correct: q.correct_answer, isCorrect: correct, bonus }]);
  }

  // ── Save score & load leaderboard on results ───────────────────────────────
  useEffect(() => {
    if (phase === "results" && user) {
      const finalScore = history.filter(h => h.isCorrect).length;
      saveScore(user.username, user.avatar, score, TOTAL).then(lb => setLeaderboard(lb));
    }
  }, [phase]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const correctCount = history.filter(h => h.isCorrect).length;
  const pct    = TOTAL > 0 ? Math.round((correctCount / TOTAL) * 100) : 0;
  const rank   = getRank(pct);

  // ── Live scoreboard (merge fake + real) ───────────────────────────────────
  const liveBoard = user ? [
    { name: user.username, avatar: user.avatar, score, isMe: true },
    ...FAKE_PLAYERS.map(p => ({ name: p.name, avatar: p.avatar, score: fakeScores[p.name] || 0, isMe: false })),
  ].sort((a,b) => b.score - a.score) : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>
      <div className="root">

        {/* ── SPLASH ── */}
        {phase === "splash" && (
          <div className="splash">
            <div className="splash-bg" />
            <div className="splash-content">
              <div className="logo-wrap">
                <span className="logo-icon">⚡</span>
                <h1 className="logo-text">QUIZBLITZ</h1>
                <p className="logo-sub">Live Multiplayer Quiz Battle</p>
              </div>
              <div className="splash-features">
                <div className="feat"><span>🌐</span><span>Live Multiplayer</span></div>
                <div className="feat"><span>🏆</span><span>Global Leaderboard</span></div>
                <div className="feat"><span>⚡</span><span>Speed Bonuses</span></div>
                <div className="feat"><span>🔥</span><span>Streak Multiplier</span></div>
              </div>
              <button className="btn-primary big" onClick={() => { setPhase("login"); }}>
                ENTER THE ARENA →
              </button>
            </div>
          </div>
        )}

        {/* ── LOGIN / SIGNUP ── */}
        {phase === "login" && (
          <div className="auth-screen">
            <div className="auth-card">
              <div className="auth-header">
                <span className="logo-icon sm">⚡</span>
                <h2>QUIZBLITZ</h2>
              </div>
              <div className="auth-tabs">
                <button className={`tab ${authMode==="login"?"active":""}`} onClick={() => { setAuthMode("login"); setAuthError(""); }}>LOGIN</button>
                <button className={`tab ${authMode==="signup"?"active":""}`} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>SIGN UP</button>
              </div>

              <input className="inp" placeholder="Username" value={loginForm.username}
                onChange={e => setLoginForm(f=>({...f, username: e.target.value}))}
                onKeyDown={e => e.key==="Enter" && handleAuth()} />
              <input className="inp" type="password" placeholder="Password" value={loginForm.password}
                onChange={e => setLoginForm(f=>({...f, password: e.target.value}))}
                onKeyDown={e => e.key==="Enter" && handleAuth()} />

              {authMode === "signup" && (
                <div className="avatar-pick">
                  <p className="pick-label">Choose Avatar</p>
                  <div className="avatar-grid">
                    {AVATARS.map(a => (
                      <button key={a}
                        className={`av-btn ${loginForm.avatar===a?"sel":""}`}
                        onClick={() => setLoginForm(f=>({...f, avatar:a}))}>{a}</button>
                    ))}
                  </div>
                </div>
              )}

              {authError && <p className="err">{authError}</p>}

              <button className="btn-primary" onClick={handleAuth}>
                {authMode === "login" ? "LOGIN →" : "CREATE ACCOUNT →"}
              </button>
              <button className="btn-ghost" onClick={() => setPhase("splash")}>← Back</button>
            </div>
          </div>
        )}

        {/* ── LOBBY ── */}
        {phase === "lobby" && user && (
          <div className="lobby">
            <div className="lobby-top">
              <div className="user-pill">
                <span>{user.avatar}</span>
                <span>{user.username}</span>
              </div>
              <button className="btn-ghost sm" onClick={() => { setUser(null); setPhase("login"); }}>Logout</button>
            </div>

            <div className="lobby-hero">
              <h1 className="lobby-title">⚡ QUIZBLITZ</h1>
              <p className="lobby-sub">Ready to battle {FAKE_PLAYERS.length} players?</p>
            </div>

            <div className="players-waiting">
              <p className="waiting-label">🟢 Players Online</p>
              <div className="players-row">
                <div className="player-chip me">
                  <span>{user.avatar}</span><span>{user.username}</span><span className="you-tag">YOU</span>
                </div>
                {FAKE_PLAYERS.map(p => (
                  <div key={p.name} className="player-chip">
                    <span>{p.avatar}</span><span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lobby-actions">
              {loadErr && <p className="err">Failed to load questions. Check connection.</p>}
              <button className="btn-primary big" onClick={startGame} disabled={loading}>
                {loading ? "⏳ Loading..." : "START QUIZ ⚡"}
              </button>
            </div>

            {/* Leaderboard preview */}
            <div className="lb-preview">
              <div className="lb-header-row">
                <span className="lb-title-txt">🏆 Global Leaderboard</span>
                <button className="btn-ghost sm" onClick={loadLeaderboard}>Refresh</button>
              </div>
              {lbLoading ? <p className="muted-txt">Loading...</p> :
               leaderboard.length === 0 ? <p className="muted-txt">No scores yet. Be the first!</p> :
               leaderboard.slice(0,8).map((e,i) => (
                <div key={i} className={`lb-row ${e.username===user.username?"lb-me":""}`}>
                  <span className="lb-rank">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                  <span className="lb-av">{e.avatar}</span>
                  <span className="lb-name">{e.username}</span>
                  <span className="lb-score">{e.score} pts</span>
                  <span className="lb-pct">{e.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && q && (
          <div className="quiz-screen">
            {/* streak popup */}
            {showStreak && (
              <div className="streak-popup">🔥 {streak} STREAK! +200 BONUS</div>
            )}

            {/* top bar */}
            <div className="quiz-topbar">
              <div className="qnum">{current+1} / {TOTAL}</div>
              <div className="cat-tag">{q.category}</div>
              <div className={`timer-badge ${timeLeft<=5?"danger":timeLeft<=8?"warn":""}`}>
                ⏱ {timeLeft}s
              </div>
            </div>

            {/* timer bar */}
            <div className="timer-track">
              <div className="timer-fill" style={{width:`${(timeLeft/TIMER)*100}%`, background: timeLeft<=5?"#FF4757":timeLeft<=8?"#FFA502":"#2ED573"}} />
            </div>

            {/* score + streak */}
            <div className="score-bar">
              <span className="score-val">⭐ {score}</span>
              {streak >= 2 && <span className="streak-badge">🔥 {streak}x STREAK</span>}
              <span className="diff-badge" style={{background: q.difficulty==="easy"?"#2ED573":q.difficulty==="medium"?"#FFA502":"#FF4757"}}>
                {q.difficulty?.toUpperCase()}
              </span>
            </div>

            {/* question */}
            <div className="question-box">
              <p className="question-txt">{q.question}</p>
            </div>

            {/* options */}
            <div className="options-grid">
              {opts.map((opt,i) => {
                let extra = "";
                if (answered) {
                  if (opt === q.correct_answer) extra = " opt-correct";
                  else if (opt === selected)    extra = " opt-wrong";
                  else                          extra = " opt-dim";
                }
                return (
                  <button key={i}
                    className={`opt-btn${extra}`}
                    style={{"--c": OPTION_COLORS[i]}}
                    onClick={() => handleAnswer(opt)}
                    disabled={answered}>
                    <span className="opt-shape">{OPTION_SHAPES[i]}</span>
                    <span className="opt-txt">{opt}</span>
                    {answered && opt===q.correct_answer && <span className="opt-icon">✓</span>}
                    {answered && opt===selected && opt!==q.correct_answer && <span className="opt-icon">✗</span>}
                  </button>
                );
              })}
            </div>

            {/* feedback */}
            {answered && (
              <div className={`feedback ${selected===q.correct_answer?"fb-correct":"fb-wrong"}`}>
                {selected===q.correct_answer
                  ? `✅ Correct! +${history[history.length-1]?.bonus} pts`
                  : `❌ Wrong! Answer: ${q.correct_answer}`}
              </div>
            )}

            {/* live scoreboard sidebar */}
            <div className="live-board">
              <p className="live-board-title">LIVE</p>
              {liveBoard.slice(0,6).map((p,i) => (
                <div key={p.name} className={`live-row ${p.isMe?"live-me":""}`}>
                  <span className="live-rank">#{i+1}</span>
                  <span className="live-av">{p.avatar}</span>
                  <span className="live-name">{p.name}</span>
                  <span className="live-score">{p.score}</span>
                </div>
              ))}
            </div>

            {answered && (
              <div className="next-wrap">
                <button className="btn-primary" onClick={advance}>
                  {current+1 < TOTAL ? "NEXT →" : "RESULTS 🏁"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <div className="results-screen">
            <div className="results-card">
              <div className="rank-hero">
                <span className="rank-emoji">{rank.emoji}</span>
                <h2 className="rank-label" style={{color:rank.color}}>{rank.label}</h2>
                <div className="final-score">{score} <span>pts</span></div>
                <p className="final-acc">{correctCount}/{TOTAL} correct · {pct}% accuracy</p>
              </div>

              {/* stat pills */}
              <div className="stat-pills">
                <div className="stat-pill"><span>✅</span><span>{correctCount} Correct</span></div>
                <div className="stat-pill"><span>❌</span><span>{TOTAL-correctCount} Wrong</span></div>
                <div className="stat-pill"><span>⭐</span><span>{score} pts</span></div>
                <div className="stat-pill"><span>📊</span><span>{pct}%</span></div>
              </div>

              {/* answer review */}
              <div className="review">
                <p className="review-title">ANSWER REVIEW</p>
                {history.map((h,i) => (
                  <div key={i} className={`review-item ${h.isCorrect?"ri-correct":"ri-wrong"}`}>
                    <span className="ri-icon">{h.isCorrect?"✅":"❌"}</span>
                    <div>
                      <p className="ri-q">{h.q}</p>
                      {!h.isCorrect && <p className="ri-a">Correct: <strong>{h.correct}</strong></p>}
                      {h.isCorrect && <p className="ri-a ri-pts">+{h.bonus} pts</p>}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => { setPhase("lobby"); loadLeaderboard(); }}>
                🏠 Back to Lobby
              </button>
              <button className="btn-ghost" style={{marginTop:8}} onClick={startGame}>
                🔁 Play Again
              </button>
            </div>

            {/* leaderboard */}
            <div className="results-lb">
              <p className="lb-title-txt">🏆 Global Leaderboard</p>
              {leaderboard.slice(0,10).map((e,i) => (
                <div key={i} className={`lb-row ${e.username===user?.username?"lb-me":""}`}>
                  <span className="lb-rank">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                  <span className="lb-av">{e.avatar}</span>
                  <span className="lb-name">{e.username}</span>
                  <div className="lb-bar-wrap">
                    <div className="lb-bar"><div className="lb-bar-fill" style={{width:`${e.pct}%`}} /></div>
                  </div>
                  <span className="lb-score">{e.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0d0d1a; --card:#16162a; --card2:#1f1f38;
  --border:rgba(255,255,255,0.08); --accent:#7c3aed;
  --text:#f0f0ff; --muted:#6b7280; --radius:16px;
}
body{font-family:'Nunito',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}

.root{min-height:100vh;display:flex;flex-direction:column;align-items:center;}

/* ── SPLASH ── */
.splash{position:relative;min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.splash-bg{position:absolute;inset:0;background:radial-gradient(ellipse 120% 80% at 50% 0%,rgba(124,58,237,0.3) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 80% 100%,rgba(255,71,87,0.2) 0%,transparent 50%),#0d0d1a;}
.splash-content{position:relative;z-index:1;text-align:center;padding:40px 24px;}
.logo-wrap{margin-bottom:48px;}
.logo-icon{font-size:64px;display:block;margin-bottom:8px;filter:drop-shadow(0 0 30px rgba(124,58,237,0.8));}
.logo-icon.sm{font-size:32px;}
.logo-text{font-size:clamp(48px,10vw,80px);font-weight:900;letter-spacing:-0.04em;background:linear-gradient(135deg,#a855f7,#ec4899,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.logo-sub{font-size:16px;color:var(--muted);margin-top:8px;font-weight:600;}
.splash-features{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:48px;}
.feat{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:100px;padding:8px 16px;font-size:14px;font-weight:700;display:flex;gap:8px;align-items:center;}

/* ── BUTTONS ── */
.btn-primary{width:100%;padding:16px;border-radius:var(--radius);border:none;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font-family:'Nunito',sans-serif;font-size:16px;font-weight:900;cursor:pointer;transition:all .2s;letter-spacing:0.05em;}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.4);}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
.btn-primary.big{font-size:18px;padding:20px;}
.btn-ghost{background:transparent;border:1.5px solid rgba(255,255,255,0.15);border-radius:var(--radius);color:var(--muted);font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;cursor:pointer;padding:12px 20px;transition:all .2s;width:100%;margin-top:8px;}
.btn-ghost:hover{border-color:rgba(255,255,255,0.3);color:var(--text);}
.btn-ghost.sm{width:auto;padding:8px 14px;font-size:13px;}

/* ── AUTH ── */
.auth-screen{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(ellipse 100% 80% at 50% 0%,rgba(124,58,237,0.15) 0%,transparent 60%),var(--bg);}
.auth-card{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:36px 32px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
.auth-header{text-align:center;margin-bottom:24px;}
.auth-header h2{font-size:28px;font-weight:900;letter-spacing:-0.03em;}
.auth-tabs{display:flex;gap:4px;background:var(--card2);border-radius:12px;padding:4px;margin-bottom:20px;}
.tab{flex:1;padding:10px;border:none;background:transparent;color:var(--muted);font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;border-radius:10px;transition:all .2s;letter-spacing:0.05em;}
.tab.active{background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;}
.inp{width:100%;padding:14px 16px;background:var(--card2);border:1.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:'Nunito',sans-serif;font-size:15px;font-weight:600;outline:none;margin-bottom:12px;transition:border-color .2s;}
.inp:focus{border-color:rgba(124,58,237,0.6);}
.inp::placeholder{color:var(--muted);}
.avatar-pick{margin-bottom:16px;}
.pick-label{font-size:13px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;}
.avatar-grid{display:flex;flex-wrap:wrap;gap:8px;}
.av-btn{width:44px;height:44px;border-radius:12px;border:2px solid transparent;background:var(--card2);font-size:22px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.av-btn.sel{border-color:#7c3aed;background:rgba(124,58,237,0.2);}
.av-btn:hover{transform:scale(1.1);}
.err{color:#FF4757;font-size:13px;font-weight:700;margin-bottom:12px;text-align:center;}
.muted-txt{color:var(--muted);font-size:14px;text-align:center;padding:16px 0;}

/* ── LOBBY ── */
.lobby{width:100%;max-width:700px;padding:24px 16px 60px;min-height:100vh;}
.lobby-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;}
.user-pill{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:100px;padding:8px 16px;font-weight:700;font-size:15px;}
.lobby-hero{text-align:center;margin-bottom:32px;}
.lobby-title{font-size:clamp(36px,8vw,60px);font-weight:900;letter-spacing:-0.04em;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.lobby-sub{color:var(--muted);font-size:16px;font-weight:600;margin-top:6px;}
.players-waiting{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px;margin-bottom:24px;}
.waiting-label{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#2ED573;margin-bottom:12px;}
.players-row{display:flex;flex-wrap:wrap;gap:8px;}
.player-chip{display:flex;align-items:center;gap:6px;background:var(--card2);border-radius:100px;padding:6px 12px;font-size:13px;font-weight:700;}
.player-chip.me{background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);}
.you-tag{background:#7c3aed;color:#fff;font-size:10px;padding:2px 6px;border-radius:100px;font-weight:900;}
.lobby-actions{margin-bottom:32px;}
.lb-preview{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px;}
.lb-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.lb-title-txt{font-size:16px;font-weight:800;}

/* ── QUIZ ── */
.quiz-screen{width:100%;max-width:900px;padding:16px;min-height:100vh;position:relative;}
.quiz-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;}
.qnum{font-family:'Space Mono',monospace;font-size:13px;color:var(--muted);font-weight:700;}
.cat-tag{font-size:11px;font-weight:800;padding:4px 12px;border-radius:100px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.3);color:#a855f7;text-transform:uppercase;letter-spacing:0.06em;}
.timer-badge{font-family:'Space Mono',monospace;font-size:16px;font-weight:700;padding:6px 14px;border-radius:100px;background:rgba(46,213,115,0.15);border:1px solid rgba(46,213,115,0.3);color:#2ED573;transition:all .3s;}
.timer-badge.warn{background:rgba(255,165,2,0.15);border-color:rgba(255,165,2,0.3);color:#FFA502;}
.timer-badge.danger{background:rgba(255,71,87,0.15);border-color:rgba(255,71,87,0.3);color:#FF4757;animation:pulse .5s infinite alternate;}
@keyframes pulse{from{transform:scale(1);}to{transform:scale(1.08);}}
.timer-track{height:6px;background:var(--card2);border-radius:100px;margin-bottom:12px;overflow:hidden;}
.timer-fill{height:100%;border-radius:100px;transition:width .9s linear,background .3s;}
.score-bar{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.score-val{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#FFA502;}
.streak-badge{background:rgba(255,71,87,0.2);border:1px solid rgba(255,71,87,0.4);color:#FF4757;font-size:12px;font-weight:800;padding:4px 10px;border-radius:100px;animation:pop .3s ease;}
.diff-badge{font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;color:#0d0d1a;margin-left:auto;text-transform:uppercase;}
@keyframes pop{from{transform:scale(1.3);}to{transform:scale(1);}}
.question-box{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px;margin-bottom:20px;min-height:100px;display:flex;align-items:center;}
.question-txt{font-size:clamp(16px,3vw,22px);font-weight:800;line-height:1.4;letter-spacing:-0.02em;}
.options-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
@media(max-width:500px){.options-grid{grid-template-columns:1fr;}}
.opt-btn{display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:16px;border:2px solid transparent;background:color-mix(in srgb,var(--c) 15%,#16162a);color:var(--text);font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;cursor:pointer;transition:all .15s;text-align:left;border-color:color-mix(in srgb,var(--c) 30%,transparent);}
.opt-btn:hover:not(:disabled){transform:translateY(-2px);background:color-mix(in srgb,var(--c) 25%,#16162a);box-shadow:0 4px 20px color-mix(in srgb,var(--c) 30%,transparent);}
.opt-btn:disabled{cursor:default;}
.opt-btn.opt-correct{background:rgba(46,213,115,0.2);border-color:#2ED573;animation:popIn .4s ease;}
.opt-btn.opt-wrong{background:rgba(255,71,87,0.2);border-color:#FF4757;animation:shakeX .4s ease;}
.opt-btn.opt-dim{opacity:0.35;}
@keyframes popIn{0%{transform:scale(1);}50%{transform:scale(1.03);}100%{transform:scale(1);}}
@keyframes shakeX{0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}
.opt-shape{font-size:20px;flex-shrink:0;width:28px;text-align:center;}
.opt-txt{flex:1;}
.opt-icon{margin-left:auto;font-size:18px;}
.feedback{padding:14px 18px;border-radius:14px;font-size:15px;font-weight:800;margin-bottom:12px;animation:fadeUp .3s ease;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.fb-correct{background:rgba(46,213,115,0.1);border:1px solid rgba(46,213,115,0.3);color:#2ED573;}
.fb-wrong{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.3);color:#FF4757;}
.next-wrap{margin-top:8px;}
.streak-popup{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#FF4757,#FFA502);color:#fff;font-size:18px;font-weight:900;padding:12px 28px;border-radius:100px;box-shadow:0 8px 30px rgba(255,71,87,0.5);animation:popIn .3s ease;z-index:100;letter-spacing:0.05em;}

/* ── LIVE BOARD ── */
.live-board{position:fixed;right:16px;top:50%;transform:translateY(-50%);background:var(--card);border:1px solid var(--border);border-radius:16px;padding:12px;width:160px;z-index:50;}
@media(max-width:700px){.live-board{display:none;}}
.live-board-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#FF4757;margin-bottom:8px;text-align:center;}
.live-row{display:flex;align-items:center;gap:6px;padding:5px 4px;border-radius:8px;font-size:12px;}
.live-row.live-me{background:rgba(124,58,237,0.15);}
.live-rank{font-family:'Space Mono',monospace;font-size:10px;color:var(--muted);width:20px;}
.live-av{font-size:14px;}
.live-name{flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;}
.live-score{font-family:'Space Mono',monospace;font-size:11px;color:#FFA502;font-weight:700;}

/* ── RESULTS ── */
.results-screen{width:100%;max-width:700px;padding:24px 16px 60px;}
.results-card{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:36px 28px;margin-bottom:20px;}
.rank-hero{text-align:center;margin-bottom:28px;}
.rank-emoji{font-size:56px;display:block;margin-bottom:8px;}
.rank-label{font-size:32px;font-weight:900;letter-spacing:-0.03em;margin-bottom:8px;}
.final-score{font-family:'Space Mono',monospace;font-size:56px;font-weight:700;color:#FFA502;line-height:1;}
.final-score span{font-size:20px;color:var(--muted);}
.final-acc{color:var(--muted);font-size:15px;font-weight:600;margin-top:8px;}
.stat-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:28px;}
.stat-pill{display:flex;align-items:center;gap:6px;background:var(--card2);border-radius:100px;padding:8px 16px;font-size:14px;font-weight:800;}
.review{margin-bottom:24px;}
.review-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:12px;}
.review-item{display:flex;gap:10px;padding:12px;background:var(--card2);border-radius:12px;margin-bottom:8px;}
.ri-icon{font-size:16px;margin-top:2px;flex-shrink:0;}
.ri-q{font-size:13px;font-weight:700;margin-bottom:3px;}
.ri-a{font-size:12px;color:var(--muted);}
.ri-pts{color:#2ED573;font-weight:800;}
.results-lb{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px;}

/* ── LEADERBOARD ROWS ── */
.lb-row{display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:10px;transition:background .15s;}
.lb-row:hover{background:var(--card2);}
.lb-row.lb-me{background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:10px;}
.lb-rank{font-size:16px;width:32px;text-align:center;flex-shrink:0;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--muted);}
.lb-av{font-size:20px;flex-shrink:0;}
.lb-name{font-weight:700;font-size:14px;flex:1;}
.lb-score{font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#FFA502;}
.lb-pct{font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);width:40px;text-align:right;}
.lb-bar-wrap{flex:1;}
.lb-bar{height:5px;background:var(--card2);border-radius:100px;overflow:hidden;}
.lb-bar-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:100px;}
`;