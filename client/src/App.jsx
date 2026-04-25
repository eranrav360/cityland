import { useEffect, useReducer, useCallback } from 'react';
import socket from './socket';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Results from './components/Results';

const initialState = {
  screen: 'home',         // 'home' | 'lobby' | 'playing' | 'stopping' | 'reviewing' | 'finished'
  roomCode: null,
  playerId: null,
  isHost: false,
  players: [],
  letter: null,
  categories: [],
  timeLeft: 90,
  roundNumber: 0,
  results: null,
  finalScores: null,
  stopCalledBy: null,
  submittedCount: 0,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ENTER_LOBBY':
      return { ...state, screen: 'lobby', roomCode: action.roomCode, playerId: action.playerId, isHost: action.isHost, players: action.players, error: null };
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.players };
    case 'HOST_CHANGED':
      return { ...state, isHost: action.hostId === state.playerId };
    case 'GAME_STARTED':
      return { ...state, screen: 'playing', letter: action.letter, categories: action.categories, timeLeft: action.timeLeft, roundNumber: action.roundNumber, results: null, stopCalledBy: null, submittedCount: 0 };
    case 'TIMER_UPDATE':
      return { ...state, timeLeft: action.timeLeft };
    case 'STOP_CALLED':
      return { ...state, screen: 'stopping', stopCalledBy: action.playerName, timeLeft: action.graceTime };
    case 'PLAYER_SUBMITTED':
      return { ...state, submittedCount: action.submittedCount };
    case 'ROUND_ENDED':
      return { ...state, screen: 'reviewing', results: action.results, letter: action.letter, categories: action.categories };
    case 'GAME_ENDED':
      return { ...state, screen: 'finished', finalScores: action.finalScores };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    socket.connect();

    socket.on('room_created', ({ roomCode, playerId, isHost, players }) => {
      dispatch({ type: 'ENTER_LOBBY', roomCode, playerId, isHost, players });
    });

    socket.on('room_joined', ({ roomCode, playerId, isHost, players }) => {
      dispatch({ type: 'ENTER_LOBBY', roomCode, playerId, isHost, players });
    });

    socket.on('room_error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', message });
    });

    socket.on('player_joined', ({ players }) => {
      dispatch({ type: 'UPDATE_PLAYERS', players });
    });

    socket.on('player_left', ({ players }) => {
      dispatch({ type: 'UPDATE_PLAYERS', players });
    });

    socket.on('host_changed', ({ hostId }) => {
      dispatch({ type: 'HOST_CHANGED', hostId });
    });

    socket.on('game_started', ({ letter, categories, timeLeft, roundNumber }) => {
      dispatch({ type: 'GAME_STARTED', letter, categories, timeLeft, roundNumber });
    });

    socket.on('timer_update', ({ timeLeft }) => {
      dispatch({ type: 'TIMER_UPDATE', timeLeft });
    });

    socket.on('stop_called', ({ playerName, graceTime }) => {
      dispatch({ type: 'STOP_CALLED', playerName, graceTime });
    });

    socket.on('player_submitted', ({ submittedCount }) => {
      dispatch({ type: 'PLAYER_SUBMITTED', submittedCount });
    });

    socket.on('round_ended', ({ letter, categories, results }) => {
      dispatch({ type: 'ROUND_ENDED', letter, categories, results });
    });

    socket.on('game_ended', ({ finalScores }) => {
      dispatch({ type: 'GAME_ENDED', finalScores });
    });

    return () => socket.disconnect();
  }, []);

  const createRoom = useCallback((playerName) => {
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('create_room', { playerName });
  }, []);

  const joinRoom = useCallback((roomCode, playerName) => {
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('join_room', { roomCode, playerName });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('start_game', { roomCode: state.roomCode });
  }, [state.roomCode]);

  const submitAnswers = useCallback((answers) => {
    socket.emit('submit_answers', { roomCode: state.roomCode, answers });
  }, [state.roomCode]);

  const callStop = useCallback((answers) => {
    socket.emit('call_stop', { roomCode: state.roomCode, answers });
  }, [state.roomCode]);

  const requestHint = useCallback((categoryId) => {
    socket.emit('request_hint', { roomCode: state.roomCode, categoryId });
  }, [state.roomCode]);

  const nextRound = useCallback(() => {
    socket.emit('next_round', { roomCode: state.roomCode });
  }, [state.roomCode]);

  const endGame = useCallback(() => {
    socket.emit('end_game', { roomCode: state.roomCode });
  }, [state.roomCode]);

  const playAgain = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  if (state.screen === 'home') {
    return <Home onCreate={createRoom} onJoin={joinRoom} error={state.error} />;
  }

  if (state.screen === 'lobby') {
    return (
      <Lobby
        roomCode={state.roomCode}
        players={state.players}
        isHost={state.isHost}
        onStart={startGame}
        error={state.error}
      />
    );
  }

  if (state.screen === 'playing' || state.screen === 'stopping') {
    return (
      <Game
        letter={state.letter}
        categories={state.categories}
        timeLeft={state.timeLeft}
        roundNumber={state.roundNumber}
        players={state.players}
        submittedCount={state.submittedCount}
        stopCalledBy={state.stopCalledBy}
        isStopping={state.screen === 'stopping'}
        onSubmit={submitAnswers}
        onStop={callStop}
        onHint={requestHint}
        socket={socket}
      />
    );
  }

  if (state.screen === 'reviewing') {
    return (
      <Results
        letter={state.letter}
        categories={state.categories}
        results={state.results}
        isHost={state.isHost}
        onNextRound={nextRound}
        onEndGame={endGame}
      />
    );
  }

  if (state.screen === 'finished') {
    return <FinalScreen scores={state.finalScores} onPlayAgain={playAgain} />;
  }

  return null;
}

function FinalScreen({ scores, onPlayAgain }) {
  const winner = scores?.[0];
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">המשחק הסתיים!</h1>
        {winner && (
          <p className="text-xl text-blue-600 font-bold mb-6">
            הזוכה: {winner.name} עם {winner.totalScore} נקודות!
          </p>
        )}
        <div className="space-y-2 mb-8">
          {scores?.map((p, i) => (
            <div key={p.id} className={`flex justify-between items-center px-4 py-2 rounded-lg ${i === 0 ? 'bg-yellow-50 border border-yellow-300' : 'bg-slate-50'}`}>
              <span className="font-bold text-slate-500 w-6">{i + 1}</span>
              <span className="font-semibold flex-1 text-right">{p.name}</span>
              <span className="font-bold text-blue-600">{p.totalScore} נק׳</span>
            </div>
          ))}
        </div>
        <button
          onClick={onPlayAgain}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-lg transition-colors"
        >
          משחק חדש
        </button>
      </div>
    </div>
  );
}
