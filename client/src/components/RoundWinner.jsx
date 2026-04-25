import { useEffect, useState } from 'react';

export default function RoundWinner({ results, roundNumber, totalRounds, onDone }) {
  const [visible, setVisible] = useState(false);

  const sorted = [...(results || [])].sort((a, b) => b.roundScore - a.roundScore);
  const winner = sorted[0];
  const isTie = sorted.length > 1 && sorted[0].roundScore === sorted[1].roundScore;
  const winners = isTie ? sorted.filter(p => p.roundScore === sorted[0].roundScore) : [winner];

  useEffect(() => {
    // Slight delay so the animation is visible
    const show = setTimeout(() => setVisible(true), 50);
    const done = setTimeout(onDone, 3200);
    return () => { clearTimeout(show); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className={`bg-white rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl transition-all duration-500 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      }`}>
        <div className="text-6xl mb-3">{winner?.roundScore > 0 ? '🏆' : '🤝'}</div>

        <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-1">
          סיבוב {roundNumber} מתוך {totalRounds}
        </p>

        {winner?.roundScore > 0 ? (
          <>
            <p className="text-slate-500 text-base mb-2">
              {isTie ? 'תיקו! מנצחי הסיבוב:' : 'מנצח הסיבוב:'}
            </p>
            <p className="text-3xl font-black text-slate-800 mb-2">
              {winners.map(w => w.playerName).join(' ו-')}
            </p>
            <p className="text-blue-600 text-xl font-bold">
              +{winner.roundScore} נקודות!
            </p>
          </>
        ) : (
          <p className="text-xl font-bold text-slate-500 mt-2">אף אחד לא ענה... 😅</p>
        )}

        <div className="mt-5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-none"
            style={{ animation: 'shrink 3.2s linear forwards' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
