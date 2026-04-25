const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getHint } = require('./hints');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const allowedOrigin = (origin, callback) => {
  if (!origin || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked: ${origin}`));
  }
};

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;
const STOP_GRACE = 15;
const DEFAULT_ROUNDS = 5;
const DEFAULT_TIME = 90;

const CATEGORIES = [
  { id: 'country',    label: 'ארץ' },
  { id: 'city',       label: 'עיר' },
  { id: 'animal',     label: 'חיה' },
  { id: 'plant',      label: 'צמח' },
  { id: 'name',       label: 'שם פרטי' },
  { id: 'profession', label: 'מקצוע' },
  { id: 'food',       label: 'אוכל/שתייה' },
  { id: 'movie',      label: 'סרט/סדרה' },
];

const HEBREW_LETTERS = ['א','ב','ג','ד','ה','ז','ח','י','כ','ל','מ','נ','ס','ע','פ','ר','ש','ת'];

// rooms: Map<roomCode, RoomObject>
const rooms = new Map();

// ─── Utilities ──────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code, attempts = 0;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    attempts++;
  } while (rooms.has(code) && attempts < 1000);
  return code;
}

function pickLetter(usedLetters) {
  const available = HEBREW_LETTERS.filter(l => !usedLetters.includes(l));
  const pool = available.length > 0 ? available : HEBREW_LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeAnswer(str) {
  return (str || '').trim().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');
}

function serializePlayers(playersMap) {
  return [...playersMap.values()].map(({ id, name, totalScore }) => ({ id, name, totalScore }));
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function calculateScores(room) {
  const scores = {};           // socketId -> round points
  const categoryScores = {};   // socketId -> { catId -> points }
  const validAnswers = {};     // socketId -> { catId -> normalized }

  for (const [sid] of room.players) {
    scores[sid] = 0;
    categoryScores[sid] = {};
    validAnswers[sid] = {};
  }

  for (const cat of CATEGORIES) {
    const catId = cat.id;
    const answered = {}; // socketId -> normalized answer (only valid ones)

    for (const [sid] of room.players) {
      const raw = (room.answers[sid] || {})[catId] || '';
      const norm = normalizeAnswer(raw);
      if (norm.length > 0 && norm[0] === room.currentLetter) {
        answered[sid] = norm;
      }
    }

    const respondents = Object.keys(answered);

    for (const [sid] of room.players) {
      let pts = 0;

      if (answered[sid] !== undefined) {
        if (respondents.length === 1) {
          pts = 15; // only one who answered
        } else {
          const myAns = answered[sid];
          const sameAsMe = respondents.filter(id => id !== sid && answered[id] === myAns);
          pts = sameAsMe.length > 0 ? 5 : 10;
        }

        // Hint cap
        if (room.hintUsed[sid]?.has(catId)) {
          pts = Math.min(pts, 5);
        }
      }

      categoryScores[sid][catId] = pts;
      scores[sid] += pts;
    }
  }

  return { scores, categoryScores };
}

// ─── Round lifecycle ─────────────────────────────────────────────────────────

const REVEAL_DELAY = 4500; // ms clients get to show the animation

function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const letter = pickLetter(room.usedLetters);
  room.usedLetters.push(letter);
  room.currentLetter = letter;
  room.roundNumber += 1;
  room.state = 'revealing';
  room.answers = {};
  room.hintUsed = {};
  room.submittedPlayers = new Set();
  room.timeLeft = room.config.timeLimit;

  for (const sid of room.players.keys()) room.answers[sid] = {};

  // Phase 1 — show the letter reveal animation on all clients
  io.to(roomCode).emit('letter_reveal', {
    letter,
    roundNumber: room.roundNumber,
    totalRounds: room.config.rounds,
  });

  // Phase 2 — start the real round after the animation finishes
  room.revealTimer = setTimeout(() => {
    if (!rooms.has(roomCode)) return;
    room.revealTimer = null;
    room.state = 'playing';

    io.to(roomCode).emit('game_started', {
      letter,
      categories: CATEGORIES,
      timeLeft: room.config.timeLimit,
      roundNumber: room.roundNumber,
      totalRounds: room.config.rounds,
    });

    room.timer = setInterval(() => {
      room.timeLeft--;
      io.to(roomCode).emit('timer_update', { timeLeft: room.timeLeft });
      if (room.timeLeft <= 0) {
        clearInterval(room.timer);
        room.timer = null;
        endRound(roomCode);
      }
    }, 1000);
  }, REVEAL_DELAY);
}

function endRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.state === 'reviewing') return;

  room.state = 'reviewing';
  if (room.revealTimer) { clearTimeout(room.revealTimer);  room.revealTimer = null; }
  if (room.timer)       { clearInterval(room.timer);       room.timer = null; }
  if (room.stopTimer)   { clearInterval(room.stopTimer);   room.stopTimer = null; }

  const { scores, categoryScores } = calculateScores(room);

  const results = [];
  for (const [sid, player] of room.players) {
    player.totalScore += scores[sid] || 0;
    results.push({
      playerId: sid,
      playerName: player.name,
      answers: room.answers[sid] || {},
      categoryScores: categoryScores[sid] || {},
      roundScore: scores[sid] || 0,
      totalScore: player.totalScore,
      usedHints: [...(room.hintUsed[sid] || new Set())],
    });
  }

  const isLastRound = room.roundNumber >= room.config.rounds;
  io.to(roomCode).emit('round_ended', {
    letter: room.currentLetter,
    categories: CATEGORIES,
    results,
    hostId: room.host,
    roundNumber: room.roundNumber,
    totalRounds: room.config.rounds,
    isLastRound,
  });
}

// ─── Socket handlers ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  socket.on('create_room', ({ playerName }) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      code: roomCode,
      host: socket.id,
      players: new Map([[socket.id, { id: socket.id, name: playerName, totalScore: 0 }]]),
      state: 'lobby',
      config: { rounds: DEFAULT_ROUNDS, timeLimit: DEFAULT_TIME },
      currentLetter: null,
      usedLetters: [],
      roundNumber: 0,
      answers: {},
      hintUsed: {},
      submittedPlayers: new Set(),
      timer: null,
      stopTimer: null,
      revealTimer: null,
      timeLeft: DEFAULT_TIME,
    });

    socket.join(roomCode);
    socket.emit('room_created', {
      roomCode,
      playerId: socket.id,
      isHost: true,
      players: serializePlayers(rooms.get(roomCode).players),
    });
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room)                      return socket.emit('room_error', { message: 'חדר לא נמצא. בדוק את הקוד ונסה שוב.' });
    if (room.state !== 'lobby')     return socket.emit('room_error', { message: 'המשחק כבר התחיל.' });
    if (room.players.size >= 8)     return socket.emit('room_error', { message: 'החדר מלא (מקסימום 8 שחקנים).' });

    room.players.set(socket.id, { id: socket.id, name: playerName, totalScore: 0 });
    socket.join(code);

    socket.emit('room_joined', {
      roomCode: code,
      playerId: socket.id,
      isHost: false,
      players: serializePlayers(room.players),
    });

    socket.to(code).emit('player_joined', { players: serializePlayers(room.players), newPlayer: playerName });
  });

  socket.on('start_game', ({ roomCode, config }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id || room.state !== 'lobby') return;
    if (room.players.size < 2) return socket.emit('room_error', { message: 'צריך לפחות 2 שחקנים כדי להתחיל.' });
    if (config) {
      room.config.rounds    = Math.min(Math.max(parseInt(config.rounds)    || DEFAULT_ROUNDS, 1), 15);
      room.config.timeLimit = Math.min(Math.max(parseInt(config.timeLimit) || DEFAULT_TIME,  30), 300);
    }
    startRound(roomCode);
  });

  socket.on('submit_answers', ({ roomCode, answers }) => {
    const room = rooms.get(roomCode);
    if (!room || (room.state !== 'playing' && room.state !== 'stopping')) return;

    room.answers[socket.id] = answers || {};
    room.submittedPlayers.add(socket.id);

    io.to(roomCode).emit('player_submitted', {
      playerId: socket.id,
      submittedCount: room.submittedPlayers.size,
      totalPlayers: room.players.size,
    });

    if (room.submittedPlayers.size >= room.players.size) endRound(roomCode);
  });

  socket.on('call_stop', ({ roomCode, answers }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'playing') return;

    // Save caller's answers and register as submitted
    room.answers[socket.id] = answers || {};
    room.submittedPlayers.add(socket.id);

    const callerName = room.players.get(socket.id)?.name || '';

    clearInterval(room.timer);
    room.timer = null;
    room.state = 'stopping';

    let graceLeft = STOP_GRACE;
    io.to(roomCode).emit('stop_called', { playerName: callerName, graceTime: graceLeft });

    room.stopTimer = setInterval(() => {
      graceLeft--;
      io.to(roomCode).emit('timer_update', { timeLeft: graceLeft });
      if (graceLeft <= 0 || room.submittedPlayers.size >= room.players.size) {
        clearInterval(room.stopTimer);
        room.stopTimer = null;
        endRound(roomCode);
      }
    }, 1000);
  });

  socket.on('request_hint', ({ roomCode, categoryId }) => {
    const room = rooms.get(roomCode);
    if (!room || (room.state !== 'playing' && room.state !== 'stopping')) return;

    if (!room.hintUsed[socket.id]) room.hintUsed[socket.id] = new Set();
    room.hintUsed[socket.id].add(categoryId);

    const hint = getHint(room.currentLetter, categoryId);
    socket.emit('hint_response', { categoryId, hint: hint || 'אין רמז זמין' });
  });

  socket.on('next_round', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id || room.state !== 'reviewing') return;
    startRound(roomCode);
  });

  socket.on('end_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    room.state = 'finished';
    const sorted = [...room.players.values()].sort((a, b) => b.totalScore - a.totalScore);
    io.to(roomCode).emit('game_ended', { finalScores: sorted });
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;

      const leaverName = room.players.get(socket.id).name;
      room.players.delete(socket.id);

      if (room.players.size === 0) {
        clearTimeout(room.revealTimer);
        clearInterval(room.timer);
        clearInterval(room.stopTimer);
        rooms.delete(code);
      } else {
        if (room.host === socket.id) {
          room.host = room.players.keys().next().value;
          io.to(code).emit('host_changed', { hostId: room.host });
        }
        io.to(code).emit('player_left', {
          playerName: leaverName,
          players: serializePlayers(room.players),
        });
        // If mid-round and last non-submitter left, maybe end round
        if (room.state === 'playing' || room.state === 'stopping') {
          if (room.submittedPlayers.size >= room.players.size) endRound(code);
        }
      }
      break;
    }
  });
});

app.get('/', (_req, res) => res.json({ status: 'ok', message: 'ארץ-עיר API server. Frontend runs on port 5173.' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: rooms.size }));

server.listen(PORT, () => console.log(`ארץ-עיר server running on port ${PORT}`));
