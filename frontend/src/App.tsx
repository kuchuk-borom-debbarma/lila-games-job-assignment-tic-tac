import React, { useState, useEffect } from 'react';
import { nakamaManager } from './nakama/client';
import { type Match } from '@heroiclabs/nakama-js';
import { Trophy, Play, LogIn, Search } from 'lucide-react';

enum GameState {
  AUTH,
  LOBBY,
  GAME
}

enum OpCode {
  MOVE = 1,
  UPDATE = 2,
  GAME_OVER = 3,
  REJECTED_MOVE = 4
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.AUTH);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [board, setBoard] = useState<number[]>(new Array(9).fill(0));
  const [nextPlayerId, setNextPlayerId] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => {
    if (nakamaManager.socket) {
      nakamaManager.socket.onmatchdata = (result) => {
        const data = JSON.parse(new TextDecoder().decode(result.data));
        console.log("Match data received:", result.op_code, data);

        if (result.op_code === OpCode.UPDATE) {
          setBoard(data.board);
          setNextPlayerId(data.nextPlayerId);
          setPlayerCount(data.playerCount);
        } else if (result.op_code === OpCode.GAME_OVER) {
          setBoard(data.board);
          if (data.winnerId) setWinnerId(data.winnerId);
          if (data.isDraw) setIsDraw(true);
        }
      };

      nakamaManager.socket.onmatchmakerticket = (t) => {
        setTicket(t.ticket);
      };

      nakamaManager.socket.onmatchmakermatched = async (matched) => {
        console.log("Match Found!", matched);
        const matchId = matched.match_id || matched.token;
        const joinedMatch = await nakamaManager.socket!.joinMatch(matchId);
        setMatch(joinedMatch);
        setGameState(GameState.GAME);
        setIsSearching(false);
        setTicket(null);
      };

      nakamaManager.socket.onmatchpresence = (event) => {
        console.log("Presence event:", event);
      };
    }
  }, [nakamaManager.socket]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nakamaManager.authenticate(password, username);
      await nakamaManager.connectSocket();
      setGameState(GameState.LOBBY);
    } catch (err) {
      alert("Authentication failed: " + err);
    }
  };

  const handlePlay = async () => {
    try {
      setIsSearching(true);
      await nakamaManager.findMatch();
    } catch (err) {
      alert("Matchmaking failed: " + err);
      setIsSearching(false);
    }
  };

  const makeMove = (index: number) => {
    if (!match || board[index] !== 0 || winnerId || isDraw) return;
    if (nextPlayerId !== nakamaManager.session?.user_id) return;
    
    console.log("Sending move:", index);
    nakamaManager.socket?.sendMatchState(match.match_id, OpCode.MOVE, JSON.stringify({ index }));
  };

  if (gameState === GameState.AUTH) {
    return (
      <div className="container">
        <h1>Lila Tic-Tac-Toe</h1>
        <form className="auth-form" onSubmit={handleAuth}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit"><LogIn size={16} /> Login / Register</button>
        </form>
      </div>
    );
  }

  if (gameState === GameState.LOBBY) {
    return (
      <div className="container">
        <h1>Welcome, {username}!</h1>
        <p style={{fontSize: '0.8rem', color: '#888'}}>ID: {nakamaManager.session?.user_id}</p>
        <div className="matchmaking">
          {isSearching ? (
            <div>
              <p><Search size={20} className="spin" /> Searching for opponent...</p>
              {ticket && <small>Ticket: {ticket.substring(0, 8)}...</small>}
              <br/>
              <button onClick={() => setIsSearching(false)} style={{marginTop: '10px'}}>Cancel</button>
            </div>
          ) : (
            <button onClick={handlePlay} style={{padding: '20px 40px', fontSize: '1.2rem'}}>
              <Play size={20} /> Play Game
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Match: {match?.match_id.substring(0, 8)}...</h2>
      <div className="status">
        {winnerId ? (
          <div style={{ color: winnerId === nakamaManager.session?.user_id ? '#4caf50' : '#f44336' }}>
            <Trophy size={24} /> {winnerId === nakamaManager.session?.user_id ? "You Won!" : "Opponent Won!"}
          </div>
        ) : isDraw ? "It's a Draw!" : playerCount < 2 ? "Waiting for opponent..." : (nextPlayerId === nakamaManager.session?.user_id ? "Your Turn" : "Opponent's Turn")}
      </div>
      <div className="board">
        {board.map((cell, i) => (
          <div key={i} className="cell" onClick={() => makeMove(i)}>
            {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
          </div>
        ))}
      </div>
      <button onClick={() => {
        setGameState(GameState.LOBBY);
        setWinnerId(null);
        setIsDraw(false);
        setBoard(new Array(9).fill(0));
        setMatch(null);
      }} style={{ marginTop: '20px' }}>Back to Lobby</button>
    </div>
  );
};

export default App;
