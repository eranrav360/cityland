import { useState } from 'react';

export default function Home({ onCreate, onJoin, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'

  const handleCreate = (e) => {
    e.preventDefault();
    if (name.trim()) onCreate(name.trim());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim() && code.trim()) onJoin(code.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black text-white drop-shadow-lg mb-2">ארץ עיר</h1>
          <p className="text-blue-200 text-lg">משחק הקטגוריות הקלאסי</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Name input always visible */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-600 mb-1">השם שלך</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="הכנס את שמך..."
              maxLength={20}
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-lg outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {!mode && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                disabled={!name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl text-lg transition-colors"
              >
                צור חדר חדש
              </button>
              <button
                onClick={() => setMode('join')}
                disabled={!name.trim()}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-bold py-3 px-6 rounded-xl text-lg transition-colors"
              >
                הצטרף לחדר
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3">
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl text-lg transition-colors"
              >
                צור חדר
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm transition-colors">
                חזרה
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">קוד החדר</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  maxLength={4}
                  className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-2xl font-mono text-center outline-none transition-colors tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || code.trim().length < 4}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl text-lg transition-colors"
              >
                הצטרף
              </button>
              <button type="button" onClick={() => setMode(null)} className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm transition-colors">
                חזרה
              </button>
            </form>
          )}
        </div>

        {/* Rules summary */}
        <div className="mt-6 bg-white/20 rounded-xl p-4 text-white text-sm space-y-1">
          <p className="font-semibold mb-2 text-base">ניקוד לפי קטגוריה:</p>
          <p>🥇 <strong>15 נק׳</strong> — רק אתה ענית</p>
          <p>🥈 <strong>10 נק׳</strong> — תשובה ייחודית</p>
          <p>🥉 <strong>5 נק׳</strong> — כולם אותה תשובה</p>
          <p>💡 <strong>רמז</strong> — מקסימום 5 נק׳ בקטגוריה</p>
        </div>
      </div>
    </div>
  );
}
