import { Client, Session, type Socket } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

class NakamaManager {
    private client: Client;
    public session: Session | null = null;
    public socket: Socket | null = null;
    private serverKey = "defaultkey";
    private host = "127.0.0.1";
    private port = "7350";
    private useSSL = false;

    constructor() {
        this.client = new Client(this.serverKey, this.host, this.port, this.useSSL);
    }

    async authenticate(password: string, username: string) {
        // We use email auth internally with a dummy domain to support passwords without requiring actual emails
        const email = `${username}@lila.games`;
        this.session = await this.client.authenticateEmail(email, password, true, username);
        sessionStorage.setItem("nakama_session", this.session.token);
        console.log("Authenticated as", username);
        return this.session;
    }

    async connectSocket() {
        if (!this.session) throw new Error("No session");
        this.socket = this.client.createSocket(this.useSSL, false);
        this.session = await this.socket.connect(this.session, true);
        return this.socket;
    }

    async findMatch(mode: 'classic' | 'timed' = 'classic') {
        if (!this.socket) throw new Error("No socket");
        // Filter players by the selected mode
        const query = `+properties.mode:${mode}`;
        const minPlayers = 2;
        const maxPlayers = 2;
        const stringProperties = { mode };
        const numericProperties = {};
        await this.socket.addMatchmaker(query, minPlayers, maxPlayers, stringProperties, numericProperties);
    }

    async getLeaderboard() {
        if (!this.session) throw new Error("No session");
        
        try {
            const [winResult, lossResult, streakResult] = await Promise.all([
                this.client.listLeaderboardRecords(this.session, 'tictactoe_wins', undefined, 10),
                this.client.listLeaderboardRecords(this.session, 'tictactoe_losses', undefined, 100), // Get more to match against top winners
                this.client.listLeaderboardRecords(this.session, 'tictactoe_streaks', undefined, 100)
            ]);

            // Merge results into a map by owner_id
            const statsMap: { [userId: string]: any } = {};

            winResult.records?.forEach(r => {
                if (r.owner_id) {
                    statsMap[r.owner_id] = { 
                        username: r.username, 
                        wins: r.score, 
                        losses: 0, 
                        bestStreak: 0 
                    };
                }
            });

            lossResult.records?.forEach(r => {
                if (!r.owner_id) return;
                if (statsMap[r.owner_id]) {
                    statsMap[r.owner_id].losses = r.score;
                } else if (Object.keys(statsMap).length < 10) {
                    statsMap[r.owner_id] = { username: r.username, wins: 0, losses: r.score, bestStreak: 0 };
                }
            });

            streakResult.records?.forEach(r => {
                if (!r.owner_id) return;
                if (statsMap[r.owner_id]) {
                    statsMap[r.owner_id].bestStreak = r.score;
                }
            });

            return Object.values(statsMap).sort((a, b) => b.wins - a.wins);
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
            return [];
        }
    }
}

export const nakamaManager = new NakamaManager();
