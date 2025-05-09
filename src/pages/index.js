import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const ROLE_DESCRIPTIONS = {
    'Student': {
        title: 'Student',
        desc: 'As a student, you represent the student perspective in Title IX matters. You can see situations from the student viewpoint and play support cards to help create a safe and equitable learning environment.',
        abilities: [
            'Can play support cards to provide peer assistance',
            'View crisis situations from student perspective',
            'Goal: Collaborate with faculty and staff to maintain a safe campus environment',
            'Tip: Share your experiences to help others understand student concerns'
        ]
    },
    'Teacher': {
        title: 'Faculty Member',
        desc: 'As a faculty member, you represent the academic perspective in Title IX matters. You can implement policies and procedures to ensure gender equity and prevent harassment in educational settings.',
        abilities: [
            'Can play policy cards to implement institutional changes',
            'View crisis situations from faculty perspective',
            'Goal: Create and maintain equitable academic policies',
            'Tip: Listen to student concerns and collaborate with staff'
        ]
    },
    'Guard': {
        title: 'Title IX Coordinator',
        desc: 'As a Title IX Coordinator, you oversee compliance and response to Title IX matters. You can provide support and ensure proper procedures are followed in addressing gender equity and harassment issues.',
        abilities: [
            'Can play support cards to implement compliance measures',
            'View crisis situations from compliance perspective',
            'Goal: Ensure proper handling of Title IX matters',
            'Tip: Coordinate between students and faculty to resolve issues'
        ]
    }
};

// 创建 socket 实例
const socket = io(SOCKET_URL, {
    path: '/api/socket',
    addTrailingSlash: false,
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true
});

// 结局内容映射
const ENDINGS = {
    'Student': {
        title: 'Flame of Truth',
        quote: 'We are not silent lambs!',
        narrative: `The student anonymously publishes fragmented evidence online, sparking a media storm.\nAudio recordings of discriminatory language, lab schedules, and server logs point to systemic corruption.\nThe president resigns, the involved professor is prosecuted, and a campus reform committee is established.`,
        keyline: 'They thought they could cover it all up, but a single spark can start a prairie fire.'
    },
    'Faculty Member': {
        title: 'Blade of Reform',
        quote: 'Reform requires wisdom, and a price.',
        narrative: `The faculty pushes through the Anti-Sexual Harassment Act.\nSchool resources are redistributed, and counseling data is encrypted into the school code.`,
        keyline: 'Perfection is the enemy of progress, but at least we let in a ray of light.'
    },
    'Title IX Coordinator': {
        title: 'Choices in the Shadows',
        quote: 'Some truths are destined to remain in the dark.',
        narrative: `The coordinator failed to protect the school.`,
        keyline: "Order above justice? Maybe I'm just a pragmatic idealist."
    }
};

export default function Home() {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [error, setError] = useState(null);
    const [roleInfo, setRoleInfo] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [showGameOver, setShowGameOver] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [lastPingTime, setLastPingTime] = useState(null);

    useEffect(() => {
        let mounted = true;
        let pingInterval;
        let reconnectTimeout;
        console.log('Component mounted, initializing socket connection...');

        const connectSocket = () => {
            if (!socket.connected && !isConnecting) {
                console.log('Attempting to connect to socket server...');
                setIsConnecting(true);
                setError(null);
                socket.connect();
            }
        };

        const handleReconnect = () => {
            if (reconnectAttempts < 10) {
                console.log(`Attempting to reconnect (${reconnectAttempts + 1}/10)...`);
                setConnectionStatus(`正在尝试重新连接 (${reconnectAttempts + 1}/10)...`);
                reconnectTimeout = setTimeout(() => {
                    connectSocket();
                }, 2000);
            } else {
                setError('连接失败，请刷新页面重试');
                setConnectionStatus('连接失败');
            }
        };

        socket.on("connect", () => {
            if (!mounted) return;
            console.log("Connected to server with ID:", socket.id);
            setConnectionStatus('Connected');
            setError(null);
            setIsConnecting(false);
            setReconnectAttempts(0);
            setLastPingTime(Date.now());

            // 设置定期ping
            pingInterval = setInterval(() => {
                if (socket.connected) {
                    socket.emit('ping');
                    setLastPingTime(Date.now());
                }
            }, 15000);
        });

        socket.on("connect_error", (error) => {
            if (!mounted) return;
            console.error("Connection error:", error);
            setConnectionStatus('Connection Error');
            setError(`连接错误: ${error.message || '无法连接到服务器'}`);
            setIsConnecting(false);
            setReconnectAttempts(prev => prev + 1);
            handleReconnect();
        });

        socket.on("disconnect", (reason) => {
            if (!mounted) return;
            console.log("Disconnected from server:", reason);
            setConnectionStatus('Disconnected');
            setIsConnecting(false);
            if (reason === 'io server disconnect') {
                // 服务器主动断开连接，尝试重新连接
                handleReconnect();
            }
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            if (!mounted) return;
            console.log(`Attempting to reconnect (${attemptNumber})...`);
            setConnectionStatus(`正在尝试重新连接 (${attemptNumber}/10)...`);
        });

        socket.on("reconnect_failed", () => {
            if (!mounted) return;
            console.log("Failed to reconnect");
            setConnectionStatus('重连失败');
            setError('无法重新连接到服务器，请刷新页面重试');
        });

        socket.on("pong", () => {
            if (!mounted) return;
            setLastPingTime(Date.now());
        });

        // 检查连接状态
        const checkConnection = () => {
            if (lastPingTime && Date.now() - lastPingTime > 30000) {
                console.log("Connection timeout, attempting to reconnect...");
                socket.disconnect();
                handleReconnect();
            }
        };

        const connectionCheckInterval = setInterval(checkConnection, 5000);

        socket.on("player_connected", (data) => {
            if (!mounted) return;
            console.log("Player connected data:", data);
            if (data.player_id) {
                console.log("Setting player ID:", data.player_id);
                setPlayerId(data.player_id);
            }
            setTotalPlayers(data.total_players);
        });

        socket.on("game_state", (state) => {
            if (!mounted) return;
            console.log("Game state updated:", state);
            console.log("Current playerId:", playerId);
            setGameState(state);
            
            // 检查玩家是否已经分配了角色
            const me = state.players.find(p => p.id === playerId);
            console.log("Current player:", me);
            
            if (me && me.role) {
                console.log("Setting role info for:", me.role);
                const roleDescription = ROLE_DESCRIPTIONS[me.role];
                console.log("Role description:", roleDescription);
                if (roleDescription) {
                    console.log("Setting role info with:", roleDescription);
                    setRoleInfo(roleDescription);
                } else {
                    console.error("No role description found for role:", me.role);
                }
            } else {
                console.log("No role assigned yet for player:", playerId);
            }
        });

        // 初始连接
        connectSocket();

        return () => {
            console.log('Component unmounting, cleaning up socket connection...');
            mounted = false;
            clearInterval(pingInterval);
            clearInterval(connectionCheckInterval);
            clearTimeout(reconnectTimeout);
            socket.off("connect");
            socket.off("connect_error");
            socket.off("disconnect");
            socket.off("reconnect_attempt");
            socket.off("reconnect_failed");
            socket.off("player_connected");
            socket.off("game_state");
            socket.off("pong");
            socket.disconnect();
        };
    }, [reconnectAttempts]);

    const handlePlayCard = (cardIndex) => {
        if (gameState && !gameState.failed) {
            socket.emit('play_card', {
                player_id: playerId,
                card_index: cardIndex
            });
        }
    };

    const handleRestart = () => {
        socket.emit('restart_game');
        setShowGameOver(false);
    };

    useEffect(() => {
        if (gameState?.failed) {
            setShowGameOver(true);
        }
    }, [gameState?.failed]);

    return (
        <div style={{ padding: '20px' }}>
            {showGameOver && (
                (() => {
                    // 获取当前玩家角色
                    const myRole = gameState?.players.find(p => p.id === playerId)?.role;
                    const ending = ENDINGS[myRole] || {
                        title: 'System Collapse',
                        quote: '',
                        narrative: 'You failed to save the campus crisis.\nPressure has reached maximum, system has collapsed.',
                        keyline: ''
                    };
                    return (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 1000,
                            color: 'white',
                            textAlign: 'center',
                            padding: '20px'
                        }}>
                            <h1 style={{ 
                                fontSize: '3rem', 
                                marginBottom: '1.5rem',
                                color: '#ff4444'
                            }}>{ending.title}</h1>
                            {ending.quote && <h2 style={{ fontStyle: 'italic', marginBottom: '1.2rem', color: '#fff' }}>&ldquo;{ending.quote}&rdquo;</h2>}
                            <p style={{ 
                                fontSize: '1.2rem', 
                                marginBottom: '2rem',
                                maxWidth: '600px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-line'
                            }}>{ending.narrative}</p>
                            {ending.keyline && <div style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '1.1rem', marginBottom: '2.5rem' }}>&ldquo;{ending.keyline}&rdquo;</div>}
                            <button
                                onClick={handleRestart}
                                style={{
                                    padding: '15px 40px',
                                    fontSize: '1.2rem',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#45a049'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#4CAF50'}
                            >
                                Restart Game
                            </button>
                        </div>
                    );
                })()
            )}

            <h1>Truth Unlocked</h1>
            <div>
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    backgroundColor: connectionStatus === 'Connected' ? '#e8f5e9' : '#ffebee',
                    borderRadius: '4px',
                    border: `1px solid ${connectionStatus === 'Connected' ? '#4CAF50' : '#f44336'}`
                }}>
                    <p style={{ margin: '0' }}>
                        <strong>连接状态:</strong> {connectionStatus}
                        {isConnecting && ' (正在连接...)'}
                    </p>
                    {error && (
                        <p style={{ 
                            color: '#f44336', 
                            margin: '5px 0 0 0',
                            fontSize: '14px'
                        }}>
                            {error}
                        </p>
                    )}
                </div>
                <p>Player ID: {playerId || 'Not Assigned'}</p>
                {/* 移除顶部 Current Players 显示，只在等待页面显示 */}
                {/* <p>Current Players: {totalPlayers}/3</p> */}
                {/* Role Info Panel */}
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    padding: '20px',
                    minWidth: '280px',
                    maxWidth: '350px',
                    zIndex: 1000,
                    fontSize: '15px',
                    border: '1px solid #e0e0e0'
                }}>
                    {gameState?.started ? (
                        <>
                            <h3 style={{ 
                                margin: '0 0 10px 0',
                                color: '#333',
                                fontSize: '18px',
                                borderBottom: '2px solid #4CAF50',
                                paddingBottom: '8px'
                            }}>{gameState.players.find(p => p.id === playerId)?.role || 'Loading...'}</h3>
                            <div style={{ 
                                marginBottom: '15px',
                                color: '#666',
                                lineHeight: '1.5'
                            }}>{ROLE_DESCRIPTIONS[gameState.players.find(p => p.id === playerId)?.role]?.desc || 'Loading role description...'}</div>
                            <div style={{ 
                                background: '#f5f5f5',
                                padding: '12px',
                                borderRadius: '6px'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 8px 0',
                                    color: '#333',
                                    fontSize: '16px'
                                }}>Role Abilities:</h4>
                                <ul style={{ 
                                    margin: '0',
                                    padding: '0 0 0 20px',
                                    listStyleType: 'none'
                                }}>
                                    {ROLE_DESCRIPTIONS[gameState.players.find(p => p.id === playerId)?.role]?.abilities?.map((ability, index) => (
                                        <li key={index} style={{ 
                                            marginBottom: '8px',
                                            position: 'relative',
                                            paddingLeft: '20px',
                                            color: '#555'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: 0,
                                                color: '#4CAF50'
                                            }}>•</span>
                                            {ability}
                                        </li>
                                    )) || <li>Loading abilities...</li>}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div style={{ 
                            color: '#666',
                            textAlign: 'center',
                            padding: '20px 0'
                        }}>
                            Waiting for game to start, roles will be assigned automatically...
                        </div>
                    )}
                </div>

                {!gameState?.started ? (
                    <div 
                        style={{ 
                            textAlign: 'center', 
                            padding: '40px',
                            minHeight: '100vh',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'url(/wait-bg.png) center center / cover no-repeat',
                        }}
                    >
                        {/* 半透明白色遮罩 */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255,255,255,0.6)',
                            zIndex: 1
                        }} />
                        <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                            <h2>Waiting for other players to join...</h2>
                            <div style={{ fontSize: '24px', margin: '20px 0' }}>
                                Current Players: {totalPlayers}/3
                            </div>
                        </div>
                    </div>
                ) : (
        <div>
                        <div style={{ margin: '20px 0' }}>
                            {gameState.players.map((player, index) => (
                                <div key={index} style={{
                                    margin: '10px 0',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    backgroundColor: player.id === playerId ? '#e8f5e9' : '#f8f9fa'
                                }}>
                                    <strong>{player.role}</strong>
                                    <span> Cards: {player.id === playerId ? player.hand.length : player.hand_count}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            height: '30px',
                            background: 'linear-gradient(to right, #4CAF50, #FFC107, #F44336)',
                            borderRadius: '15px',
                            margin: '20px 0',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '5px',
                                left: `${(gameState.pressure / gameState.max_pressure) * 100}%`,
                                transition: 'left 0.3s'
                            }} />
                        </div>
                        <div>Pressure: {gameState.pressure}/{gameState.max_pressure}</div>

                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            marginBottom: '30px',
                            flexWrap: 'wrap'
                        }}>
                            {gameState.active_crises.map((crisis, index) => (
                                <div key={index} style={{
                                    width: '400px',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                    border: `3px solid ${
                                        crisis.level === 1 ? '#4CAF50' :
                                        crisis.level === 2 ? '#FFC107' : '#F44336'
                                    }`
                                }}>
                                    <h3>Level {crisis.level} Crisis</h3>
                                    <div><b>Teacher View:</b> {crisis.desc_for_teacher}</div>
                                    <div><b>Student View:</b> {crisis.desc_for_student}</div>
                                    <div><b>Guard View:</b> {crisis.desc_for_guard}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            marginTop: '30px',
                            flexWrap: 'wrap'
                        }}>
                            {gameState.players.find(p => p.id === playerId)?.hand.map((card, index) => (
                                <div key={index} style={{
                                    width: '150px',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                    cursor: gameState.failed ? 'not-allowed' : 'pointer',
                                    opacity: gameState.failed ? 0.5 : 1,
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => !gameState.failed && handlePlayCard(index)}
                                onMouseOver={e => !gameState.failed && (e.currentTarget.style.transform = 'translateY(-5px)')}
                                onMouseOut={e => !gameState.failed && (e.currentTarget.style.transform = 'translateY(0)')}>
                                    <h4>{card.title}</h4>
                                    <p>{card.effect}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
