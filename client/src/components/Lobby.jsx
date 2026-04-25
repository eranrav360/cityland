import { useState } from 'react';

const TIME_OPTIONS = [
  { value: 45,  label: '45 שנ׳' },
  { value: 60,  label: 'דקה' },
  { value: 90,  label: '1:30' },
  { value: 120, label: '2 דק׳' },
  { value: 180, label: '3 דק׳' },
  { value: 240, label: '4 דק׳' },
];

export default function Lobby({ roomCode, players, isHost, onStart, error }) {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({ rounds: 5, timeLimit: 90 });

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-1 text-center">חדר המתנה</h2>
        <p className="text-slate-500 text-sm text-center mb-5">ממתינים לשחקנים נוספים...</p>

        {/* Room code */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-5 text-center">
          <p className="text-xs font-semibold text-blue-500 mb-1">קוד החדר</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-black font-mono tracking-widest text-blue-700">{roomCode}</span>
            <button onClick={copyCode} className="text-blue-400 hover:text-blue-700 transition-colors text-xl">
              {copied ? '✅' : '📋'}
            </button>
          </div>
          <p className="text-xs text-blue-400 mt-1">שתף את הקוד עם חברים</p>
        </div>

        {/* Players list */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-slate-500 mb-2">שחקנים ({players.length}/8):</p>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-medium text-slate-700">{p.name}</span>
                {i === 0 && <span className="mr-auto text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 rounded px-2 py-0.5">מארח</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Host config */}
        {isHost && (
          <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-4">
            <p className="text-sm font-bold text-slate-600">הגדרות משחק</p>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                מספר סיבובים: <span className="text-blue-600 font-bold">{config.rounds}</span>
              </label>
              <input
                type="range"
                min={1} max={15} step={1}
                value={config.rounds}
                onChange={e => setConfig(c => ({ ...c, rounds: +e.target.value }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1</span><span>15</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">זמן לכל סיבוב</label>
              <div className="grid grid-cols-3 gap-1.5 rtl:text-center">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setConfig(c => ({ ...c, timeLimit: opt.value }))}
                    className={`text-xs font-semibold py-1.5 rounded-lg border transition-colors ${
                      config.timeLimit === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isHost && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 text-sm text-slate-500 text-center">
            המארח יקבע את הגדרות המשחק
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {isHost ? (
          <button
            onClick={() => onStart(config)}
            disabled={players.length < 2}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl text-lg transition-colors"
          >
            {players.length < 2 ? 'ממתין לשחקנים...' : `התחל משחק (${config.rounds} סיבובים)`}
          </button>
        ) : (
          <div className="text-center text-slate-500 font-medium py-3">
            ⏳ ממתינים למארח להתחיל...
          </div>
        )}
      </div>
    </div>
  );
}
