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

    async findMatch() {
        if (!this.socket) throw new Error("No socket");
        // Built-in matchmaking
        const query = "*";
        const minPlayers = 2;
        const maxPlayers = 2;
        await this.socket.addMatchmaker(query, minPlayers, maxPlayers);
    }

    async getLeaderboard() {
        if (!this.session) throw new Error("No session");
        const id = 'tictactoe_wins';
        const result = await this.client.listLeaderboardRecords(this.session, id);
        return result.records || [];
    }
}

export const nakamaManager = new NakamaManager();
