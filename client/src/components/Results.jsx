import { useState } from 'react';

const SCORE_STYLES = {
  15: 'bg-green-100 text-green-800 border-green-300',
  10: 'bg-blue-100 text-blue-800 border-blue-300',
  5:  'bg-yellow-100 text-yellow-800 border-yellow-300',
  0:  'bg-slate-100 text-slate-400 border-slate-200',
};

const SCORE_LABELS = {
  15: '⭐',
  10: '✓',
  5:  '=',
  0:  '✗',
};

export default function Results({ letter, categories, results, roundNumber, totalRounds, isLastRound, isHost, onNextRound, onEndGame, onAppeal }) {
  const [appeal, setAppeal] = useState(null); // { playerId, playerName, categoryId, categoryLabel, currentScore }
  const [appealInput, setAppealInput] = useState('');

  const sorted = [...(results || [])].sort((a, b) => b.totalScore - a.totalScore);

  const openAppeal = (playerId, playerName, categoryId, categoryLabel, currentScore) => {
    setAppeal({ playerId, playerName, categoryId, categoryLabel, currentScore });
    setAppealInput(String(currentScore));
  };

  const confirmAppeal = () => {
    const val = parseInt(appealInput);
    if (isNaN(val) || val < 0 || val > 100) return;
    onAppeal(appeal.playerId, appeal.categoryId, val);
    setAppeal(null);
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-5 shadow-md">
        <div className="max-w-3xl mx-auto">
          <p className="text-blue-200 text-sm font-medium mb-1">סיבוב {roundNumber} מתוך {totalRounds}</p>
          <h2 className="text-3xl font-black">האות: {letter}</h2>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Scoreboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-slate-600 text-sm mb-3">טבלת ניקוד כוללת</h3>
          <div className="space-y-2">
            {sorted.map((p, i) => (
              <div key={p.playerId} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
                <span className="font-bold text-slate-400 w-5 text-sm">{i + 1}</span>
                <span className="font-semibold flex-1">{p.playerName}</span>
                <span className="text-sm text-slate-500">+{p.roundScore}</span>
                <span className="font-bold text-blue-700 text-lg w-16 text-left">{p.totalScore} נק׳</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answers table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <h3 className="font-bold text-slate-600 text-sm">תשובות</h3>
            <span className="text-xs text-slate-400">(לחץ על הניקוד לערעור)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right px-4 py-2 font-semibold text-slate-500 w-28">קטגוריה</th>
                  {results?.map(p => (
                    <th key={p.playerId} className="px-3 py-2 font-semibold text-slate-600 text-center min-w-[100px]">
                      {p.playerName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                      {cat.emoji} {cat.label}
                    </td>
                    {results?.map(p => {
                      const answer = p.answers[cat.id] || '';
                      const pts = p.categoryScores[cat.id] ?? 0;
                      const usedHint = p.usedHints?.includes(cat.id);
                      return (
                        <td key={p.playerId} className="px-3 py-3 text-center">
                          {answer ? (
                            <div className="space-y-1">
                              <p className={`font-medium ${pts === 0 ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {answer}
                              </p>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openAppeal(p.playerId, p.playerName, cat.id, cat.label, pts)}
                                  title="ערעור על הניקוד"
                                  className={`text-xs px-1.5 py-0.5 rounded border font-semibold transition-all hover:ring-2 hover:ring-blue-400 hover:scale-105 cursor-pointer ${SCORE_STYLES[pts] || SCORE_STYLES[0]}`}
                                >
                                  {SCORE_LABELS[pts] || '✗'} {pts > 0 ? pts : '0'}
                                </button>
                                {usedHint && <span className="text-xs text-amber-500" title="השתמש ברמז">💡</span>}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAppeal(p.playerId, p.playerName, cat.id, cat.label, 0)}
                              title="ערעור על הניקוד"
                              className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                            >
                              —
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        {isHost ? (
          <div className="flex gap-3 pb-6">
            {!isLastRound && (
              <button onClick={onEndGame} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl text-base transition-colors">
                סיום מוקדם
              </button>
            )}
            <button
              onClick={isLastRound ? onEndGame : onNextRound}
              className={`font-bold py-3 rounded-xl text-base transition-colors text-white ${isLastRound ? 'flex-1 bg-green-500 hover:bg-green-600' : 'flex-grow-[2] bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLastRound ? '🏆 לוח תוצאות סופי' : 'סיבוב הבא ←'}
            </button>
          </div>
        ) : (
          <div className="pb-6 text-center text-slate-500 font-medium py-3">
            ⏳ ממתינים למארח...
          </div>
        )}
      </div>

      {/* Appeal modal */}
      {appeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
            <p className="text-3xl mb-3">⚖️</p>
            <h3 className="text-xl font-black mb-1">ערעור על ניקוד</h3>
            <p className="text-slate-500 text-sm mb-1">
              <strong>{appeal.playerName}</strong> — {appeal.categoryLabel}
            </p>
            <p className="text-slate-400 text-xs mb-4">
              ניקוד נוכחי: <strong>{appeal.currentScore}</strong>
            </p>
            <input
              type="number"
              min={0}
              max={100}
              value={appealInput}
              onChange={e => setAppealInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmAppeal()}
              autoFocus
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-2xl text-center font-bold outline-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setAppeal(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors">
                ביטול
              </button>
              <button onClick={confirmAppeal} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition-colors">
                אשר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
