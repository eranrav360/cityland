import { useState, useEffect, useCallback, useRef } from 'react';

export default function Game({
  letter, categories, timeLeft, roundNumber,
  players, submittedCount,
  stopCalledBy, isStopping,
  onSubmit, onStop, onHint, socket,
}) {
  const [answers, setAnswers] = useState({});
  const [hints, setHints] = useState({});       // categoryId -> hint text
  const [hintUsed, setHintUsed] = useState({}); // categoryId -> true
  const [submitted, setSubmitted] = useState(false);
  const [hintConfirm, setHintConfirm] = useState(null); // categoryId waiting for confirm

  // Reset on new round
  useEffect(() => {
    setAnswers({});
    setHints({});
    setHintUsed({});
    setSubmitted(false);
    setHintConfirm(null);
  }, [letter, roundNumber]);

  // Listen for hint responses
  useEffect(() => {
    const handler = ({ categoryId, hint }) => {
      setHints(h => ({ ...h, [categoryId]: hint }));
    };
    socket.on('hint_response', handler);
    return () => socket.off('hint_response', handler);
  }, [socket]);

  const handleChange = (catId, value) => {
    setAnswers(a => ({ ...a, [catId]: value }));
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(answers);
  };

  const handleStop = () => {
    if (submitted) return;
    setSubmitted(true);
    onStop(answers);
  };

  const askHint = (catId) => {
    setHintConfirm(catId);
  };

  const confirmHint = (catId) => {
    setHintUsed(h => ({ ...h, [catId]: true }));
    setHintConfirm(null);
    onHint(catId);
  };

  const isAnswerInvalid = (catId) => {
    const val = (answers[catId] || '').trim();
    return val.length > 0 && val[0] !== letter;
  };

  const timerCritical = timeLeft <= 10 && timeLeft > 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const timerPercent = Math.max(0, (timeLeft / 90) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className={`sticky top-0 z-10 shadow-md px-4 py-3 transition-colors ${isStopping ? 'bg-orange-500' : 'bg-blue-600'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-white">
            <p className="text-xs font-medium opacity-80">סיבוב {roundNumber}</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black">{letter}</span>
              <div>
                <p className="text-xs opacity-70">האות</p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            {isStopping ? (
              <div>
                <p className="text-white text-xs font-semibold">⛔ {stopCalledBy} קרא סטופ!</p>
                <p className={`text-3xl font-black text-white ${timerCritical ? 'timer-critical' : ''}`}>{timerDisplay}</p>
              </div>
            ) : (
              <p className={`text-4xl font-black text-white ${timerCritical ? 'timer-critical' : ''}`}>{timerDisplay}</p>
            )}
            {/* Progress bar */}
            <div className="w-24 h-1.5 bg-white/30 rounded-full mt-1 mx-auto overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Submitted info */}
          <div className="text-white text-right">
            <p className="text-xs opacity-70">הגישו</p>
            <p className="text-xl font-bold">{submittedCount}/{players.length}</p>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`bg-white rounded-xl border-2 p-3 transition-colors ${
                isAnswerInvalid(cat.id) ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700">{cat.label}</span>
                <div className="flex items-center gap-1.5">
                  {hintUsed[cat.id] && (
                    <span className="hint-badge">💡 רמז</span>
                  )}
                  {!hintUsed[cat.id] && !submitted && (
                    <button
                      onClick={() => askHint(cat.id)}
                      className="text-xs text-amber-600 hover:text-amber-800 border border-amber-300 hover:border-amber-500 rounded px-2 py-0.5 transition-colors"
                    >
                      💡 רמז
                    </button>
                  )}
                </div>
              </div>

              {hints[cat.id] && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-1.5">
                  דוגמה: <strong>{hints[cat.id]}</strong> — מקסימום 5 נק׳
                </p>
              )}

              <input
                type="text"
                value={answers[cat.id] || ''}
                onChange={e => handleChange(cat.id, e.target.value)}
                disabled={submitted}
                placeholder={`${letter}...`}
                maxLength={30}
                className={`w-full border rounded-lg px-3 py-2 text-base outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${
                  isAnswerInvalid(cat.id)
                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-400'
                }`}
              />
              {isAnswerInvalid(cat.id) && (
                <p className="text-xs text-red-500 mt-1">התשובה חייבת להתחיל באות {letter}</p>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {!submitted && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleStop}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-lg transition-colors"
            >
              ⛔ סטופ!
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-lg transition-colors"
            >
              שלח תשובות ✓
            </button>
          </div>
        )}

        {submitted && (
          <div className="mt-5 text-center bg-green-50 border border-green-200 rounded-xl py-4 text-green-700 font-semibold">
            ✅ תשובות נשלחו! ממתין לשחקנים אחרים...
          </div>
        )}
      </div>

      {/* Hint confirm modal */}
      {hintConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
            <p className="text-5xl mb-3">💡</p>
            <h3 className="text-xl font-black mb-2">השתמש ברמז?</h3>
            <p className="text-slate-500 text-sm mb-5">
              אם תשתמש ברמז לקטגוריה זו, תוכל לקבל <strong>מקסימום 5 נקודות</strong> בלבד עבורה.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setHintConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => confirmHint(hintConfirm)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl transition-colors"
              >
                קבל רמז
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
