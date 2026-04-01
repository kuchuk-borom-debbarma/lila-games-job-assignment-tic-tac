import { MatchState, OpCode } from "./models";

export type MoveResult =
    | { type: 'REJECTED'; reason: string }
    | { type: 'WIN'; winnerId: string }
    | { type: 'DRAW' }
    | { type: 'NEXT_TURN'; nextPlayerId: string };

export class TicTacToeGame {
    constructor(
        protected ctx: nkruntime.Context,
        protected logger: nkruntime.Logger,
        protected nk: nkruntime.Nakama,
        protected dispatcher: nkruntime.MatchDispatcher,
        protected state: MatchState
    ) {}

    /**
     * Master Game Loop: Encapsulates all logic for a single server tick.
     */
    public update(_tick: number, messages: nkruntime.MatchMessage[]): void {
        // 1. Process all incoming messages
        messages.forEach((msg) => {
            if (msg.opCode === OpCode.MOVE) {
                const data = JSON.parse(this.nk.binaryToString(msg.data));
                this.playTurn(msg.sender.userId, data.index);
            }
        });
    }

    public playTurn(userId: string, index: number): void {
        const result = this.executeMove(userId, index);

        switch (result.type) {
            case 'REJECTED':
                this.dispatcher.broadcastMessage(OpCode.REJECTED_MOVE, result.reason, [this.state.presences[userId]?.presence]);
                break;
            case 'WIN':
                this.handleWin(result.winnerId);
                break;
            case 'DRAW':
                this.handleDraw();
                break;
            case 'NEXT_TURN':
                this.broadcastUpdate();
                break;
        }
    }

    protected executeMove(userId: string, index: number): MoveResult {
        if (this.state.winnerId || this.state.isDraw) return { type: 'REJECTED', reason: 'Game over' };
        if (userId !== this.state.nextPlayerId) return { type: 'REJECTED', reason: 'Not your turn' };
        if (index < 0 || index > 8 || this.state.board[index] !== 0) return { type: 'REJECTED', reason: 'Invalid move' };

        const player = this.state.presences[userId];
        this.state.board[index] = player.symbol;

        if (this.checkWin(player.symbol)) return { type: 'WIN', winnerId: userId };
        if (this.checkDraw()) return { type: 'DRAW' };

        this.advanceTurn(userId);
        return { type: 'NEXT_TURN', nextPlayerId: this.state.nextPlayerId };
    }

    protected handleWin(winnerId: string) {
        this.state.winnerId = winnerId;
        
        const winner = this.state.presences[winnerId];
        this.recordLeaderboardWin(winnerId, winner.presence.username);
        
        const loserId = Object.keys(this.state.presences).find(id => id !== winnerId);
        if (loserId) {
            this.recordLeaderboardLoss(loserId, this.state.presences[loserId].presence.username);
        }

        this.dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
            winnerId,
            board: this.state.board
        }));
    }

    protected handleDraw() {
        this.state.isDraw = true;
        this.dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
            isDraw: true,
            board: this.state.board
        }));
    }

    public broadcastUpdate() {
        this.dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
            board: this.state.board,
            nextPlayerId: this.state.nextPlayerId,
            playerCount: Object.keys(this.state.presences).length
        }));
    }

    private recordLeaderboardWin(userId: string, username: string) {
        try {
            this.nk.leaderboardRecordWrite('tictactoe_wins', userId, username, 1, 0, {}, 'increment' as any);
        } catch (e) { this.logger.error('Leaderboard error: %s', e); }
    }

    private recordLeaderboardLoss(userId: string, username: string) {
        try {
            this.nk.leaderboardRecordWrite('tictactoe_losses', userId, username, 1, 0, {}, 'increment' as any);
        } catch (e) { this.logger.error('Leaderboard error: %s', e); }
    }

    protected advanceTurn(currentUserId: string) {
        const otherPlayerId = Object.keys(this.state.presences).find(id => id !== currentUserId);
        this.state.nextPlayerId = otherPlayerId || '';
    }

    protected checkWin(symbol: number): boolean {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return wins.some(c => c.every(i => this.state.board[i] === symbol));
    }

    protected checkDraw(): boolean { return this.state.board.every(c => c !== 0); }
}

export class TimedTicTacToeGame extends TicTacToeGame {
    private readonly MOVE_TIMEOUT_TICKS = 30;

    /**
     * Overridden Update: Injects the timeout check before processing messages.
     */
    public update(tick: number, messages: nkruntime.MatchMessage[]): void {
        this.processTimeout(tick);
        
        // Only process moves if the timeout didn't just end the game
        if (!this.state.winnerId && !this.state.isDraw) {
            super.update(tick, messages);
        }
    }

    public playTurn(userId: string, index: number): void {
        super.playTurn(userId, index);
        // Reset timer if turn successfully advanced
        if (this.state.nextPlayerId !== userId) {
            this.state.deadlineCount = 0; 
        }
    }

    private processTimeout(tick: number): void {
        if (this.state.winnerId || this.state.isDraw || Object.keys(this.state.presences).length < 2) return;

        if (this.state.deadlineCount === 0) {
            this.state.deadlineCount = tick + this.MOVE_TIMEOUT_TICKS;
            return;
        }

        if (tick > this.state.deadlineCount) {
            const loserId = this.state.nextPlayerId;
            const winnerId = Object.keys(this.state.presences).find(id => id !== loserId);
            if (winnerId) {
                this.logger.info('Timeout occurred: %s wins by inactivity', winnerId);
                this.handleWin(winnerId);
                this.state.gameOverTick = tick; // Set termination countdown
            }
        }
    }
}
