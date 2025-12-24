"use client";

import { useState, useRef, useEffect } from 'react';

// --- Types & Virtual Client ---

type TestLog = {
    id: number;
    timestamp: string;
    source: 'SYS' | 'BOT_A' | 'BOT_B';
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
};

class VirtualClient {
    id: string;
    ws: WebSocket | null = null;
    logs: (type: TestLog['type'], msg: string) => void;

    // State
    isConnected = false;
    matchFound = false;
    matchTime = 0;
    handshakeComplete = false;
    role: 'producer' | 'consumer' | null = null;

    // Callbacks for test runner
    onMatch?: (data: any) => void;
    onMessage?: (data: any) => void;

    constructor(name: string, logger: (type: TestLog['type'], msg: string) => void) {
        this.id = name;
        this.logs = logger;
    }

    connect() {
        const userId = `TEST_BOT_${this.id}_${Math.random().toString(36).substr(2, 5)}`;
        this.logs('info', `Connecting... (${userId})`);

        // Dynamic Host Detection for Mobile Testing
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const wsUrl = `ws://${host}:8080/con/request?userId=${userId}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            if (!this.isConnected) {
                this.isConnected = true;
                this.logs('success', 'Socket Open');
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if ((data as any).message === "ready") {
                    // Waiting in queue
                    return;
                }

                if (data.type === 'start') {
                    this.matchFound = true;
                    this.matchTime = Date.now();
                    this.role = data.role;
                    this.logs('success', `MATCHED! Role: ${data.role}`);
                    if (this.onMatch) this.onMatch(data);
                } else if (data.type === 'message' || data.type === 'ping') {
                    if (this.onMessage) this.onMessage(data);
                }

            } catch (e) {
                this.logs('error', 'Bad Msg');
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.matchFound = false;
            this.logs('warning', 'Socket Closed');
        };
    }

    send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    reset() {
        if (this.ws) this.ws.close();
        this.isConnected = false;
        this.matchFound = false;
        this.handshakeComplete = false;
        this.connect();
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

// --- Main Component ---

export default function DiagnosticsPage() {
    const [logs, setLogs] = useState<TestLog[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED'>('IDLE');

    // Auto-scroll to bottom of logs
    const logsEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (source: TestLog['source'], type: TestLog['type'], message: string) => {
        setLogs(prev => [...prev, {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString().split(' ')[0],
            source,
            type,
            message
        }]);
    };

    const runP2PTest = async () => {
        if (status === 'RUNNING') return;
        setStatus('RUNNING');
        setLogs([]);

        // Session Token keeps ensure we are matching with CURRENT bots
        const SESSION_TOKEN = `SES_${Math.random().toString(36).substr(2, 6)}`;
        addLog('SYS', 'info', `🔑 Session ID: ${SESSION_TOKEN}`);

        const botA = new VirtualClient('A', (t, m) => addLog('BOT_A', t, m));
        const botB = new VirtualClient('B', (t, m) => addLog('BOT_B', t, m));

        let p2pVerified = false;
        let ghostCount = 0;

        try {
            addLog('SYS', 'info', '🚀 STARTING ROBUSTNESS SIMULATION');
            addLog('SYS', 'info', 'Waiting for bots to find each other...');

            botA.connect();
            botB.connect();

            // Run simulation loop
            await new Promise<void>((resolve, reject) => {
                const startTime = Date.now();
                const loop = setInterval(() => {
                    // Global Timeout
                    if (Date.now() - startTime > 15000) {
                        clearInterval(loop);
                        reject(new Error("Simulation Timeout - Bots never exchanged verified pings."));
                    }

                    if (p2pVerified) {
                        clearInterval(loop);
                        resolve();
                        return;
                    }

                    // --- BOT A LOGIC ---
                    if (botA.matchFound) {
                        const timeout = botA.role === 'consumer' ? 2000 : 15000;
                        if (!botA.handshakeComplete && Date.now() - botA.matchTime > timeout) {
                            addLog('BOT_A', 'warning', `Handshake Timeout (${timeout}ms). Ghost Busting!`);
                            ghostCount++;
                            botA.reset();
                        } else if (!p2pVerified) {
                            // Keep pinging until GLOBAL verification (Both sides happy)
                            if (Math.random() > 0.5) botA.send({ type: 'ping', token: SESSION_TOKEN });
                        }
                    }

                    // --- BOT B LOGIC ---
                    if (botB.matchFound) {
                        const timeout = botB.role === 'consumer' ? 2000 : 15000;
                        if (!botB.handshakeComplete && Date.now() - botB.matchTime > timeout) {
                            addLog('BOT_B', 'warning', `Handshake Timeout (${timeout}ms). Ghost Busting!`);
                            ghostCount++;
                            botB.reset();
                        } else if (!p2pVerified) {
                            // Keep pinging until GLOBAL verification
                            if (Math.random() > 0.5) botB.send({ type: 'ping', token: SESSION_TOKEN });
                        }
                    }

                }, 200);

                // Verification Listener
                const verify = (data: any, receiver: VirtualClient) => {
                    if (data.type === 'ping' && data.token === SESSION_TOKEN) {
                        if (!receiver.handshakeComplete) {
                            receiver.handshakeComplete = true;
                            addLog(receiver.id === 'A' ? 'BOT_A' : 'BOT_B', 'success', '✅ Verified Partner Ping!');
                        }
                    }
                    if (botA.handshakeComplete && botB.handshakeComplete) {
                        p2pVerified = true;
                    }
                };

                botA.onMessage = (d) => verify(d, botA);
                botB.onMessage = (d) => verify(d, botB);
            });

            addLog('SYS', 'success', `🏆 P2P CONNECTION SECURE! (Ghosts Busted: ${ghostCount})`);

            // Final Chat Test
            botA.send({ type: 'message', text: "Hello", username: "BotA", token: SESSION_TOKEN });
            addLog('BOT_A', 'info', 'Sent Chat Message');

            setStatus('PASSED');

        } catch (error: any) {
            setStatus('FAILED');
            addLog('SYS', 'error', `🛑 FAILURE: ${error.message}`);
        } finally {
            botA.disconnect();
            botB.disconnect();
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex flex-col text-sm">
            <header className="mb-4 flex justify-between items-center border-b border-green-900 pb-2">
                <div>
                    <h1 className="text-lg font-bold text-green-400">P2P ROBUSTNESS LAB</h1>
                    <p className="text-xs text-green-700">Multi-Agent Simulation Suite</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${status === 'PASSED' ? 'bg-green-500 text-black' : status === 'FAILED' ? 'bg-red-500 text-black' : 'bg-neutral-800'}`}>
                        {status}
                    </div>
                    <button
                        onClick={runP2PTest}
                        disabled={status === 'RUNNING'}
                        className={`px-4 py-2 rounded text-xs ${status === 'RUNNING' ? 'bg-green-900 text-green-500' : 'bg-green-600 text-black hover:bg-green-500'} font-bold transition-colors`}
                    >
                        {status === 'RUNNING' ? 'EXECUTING...' : 'INITIATE STRESS TEST'}
                    </button>
                </div>
            </header>

            <div className="flex-1 bg-neutral-900/30 rounded border border-green-900/50 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />

                <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono">
                    {logs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-green-900 flex-col">
                            <div className="w-16 h-16 border-2 border-green-900 rounded-full mb-4 flex items-center justify-center animate-pulse">
                                ⚡
                            </div>
                            <p>Ready to Simulate Traffic</p>
                        </div>
                    )}
                    {logs.map(log => (
                        <div key={log.id} className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-green-500/80'}`}>
                            <span className="text-neutral-600 w-16 shrink-0 text-right">[{log.timestamp}]</span>
                            <span className={`w-16 shrink-0 font-bold ${log.source === 'SYS' ? 'text-white' : log.source === 'BOT_A' ? 'text-blue-400' : 'text-purple-400'}`}>
                                {log.source}
                            </span>
                            <span className="flex-1 border-l border-green-900/30 pl-3">
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
