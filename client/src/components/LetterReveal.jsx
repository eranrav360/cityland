import { useEffect, useState } from 'react';

const ALL_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

export default function LetterReveal({ letter, roundNumber, totalRounds }) {
  const [display, setDisplay] = useState(ALL_LETTERS[0]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setDisplay(ALL_LETTERS[0]);
    setRevealed(false);

    let step = 0;
    const totalSteps = 28;

    const tick = () => {
      if (step >= totalSteps) {
        setDisplay(letter);
        setRevealed(true);
        return;
      }

      const progress = step / totalSteps;
      // Bias toward showing the real letter as we slow down
      const showReal = progress > 0.75 && Math.random() < (progress - 0.75) * 4;
      setDisplay(showReal ? letter : ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]);

      step++;
      // Exponential slowdown: 55ms → 480ms
      const delay = 55 + Math.pow(progress, 2.2) * 480;
      setTimeout(tick, delay);
    };

    tick();
  }, [letter]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center z-50 p-4" dir="rtl">
      <p className="text-white/70 text-lg font-semibold mb-1">
        סיבוב {roundNumber} מתוך {totalRounds}
      </p>
      <p className="text-white text-2xl font-bold mb-10">האות של הסיבוב היא...</p>

      {/* Slot display */}
      <div className={`relative bg-white rounded-3xl shadow-2xl w-44 h-44 flex items-center justify-center transition-all duration-300 ${
        revealed ? 'scale-110 ring-8 ring-white/40 ring-offset-4 ring-offset-transparent' : 'scale-100'
      }`}>
        {/* Spinning blur lines (decorative) */}
        {!revealed && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-10">
            <div className="absolute inset-x-0 top-1/4 h-px bg-blue-600" />
            <div className="absolute inset-x-0 top-2/4 h-px bg-blue-600" />
            <div className="absolute inset-x-0 top-3/4 h-px bg-blue-600" />
          </div>
        )}
        <span className={`font-black leading-none select-none transition-all duration-150 ${
          revealed ? 'text-9xl text-blue-600' : 'text-8xl text-slate-300'
        }`}>
          {display}
        </span>
      </div>

      {revealed && (
        <div className="mt-10 text-center">
          <p className="text-white text-3xl font-black animate-pulse">האות: {letter}</p>
          <p className="text-white/60 text-base mt-2">מתחילים עוד רגע...</p>
        </div>
      )}
    </div>
  );
}
