const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Basic CORS configuration
app.use(cors());

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Basic routes
app.get('/', (req, res) => {
    res.json({ message: 'Game server is running' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize Socket.IO
const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 120000,
    pingInterval: 50000,
    connectTimeout: 20000,
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000
});

// Game state
let gameState = {
    pressure: 0,
    max_pressure: 10,
    active_crises: [],
    current_player: 1,
    players: [],
    started: false,
    failed: false,
    used_crisis_cards: []
};

const AVAILABLE_ROLES = ['Student', 'Teacher', 'Guard'];

const ROLE_CARD_TYPES = {
    'Teacher': ['policy', 'teacher'],
    'Student': ['support', 'student'],
    'Guard': ['support', 'guard']
};

// Crisis cards definition
const crisisCards = [
    {
        "level": 1,
        "title": "Academic Discrimination",
        "desc_for_teacher": "I notice a female student being rejected from advanced research opportunities.",
        "desc_for_student": "Someone suggests I should focus on more important things due to my gender.",
        "desc_for_guard": "An incident occurred in the research building that needs immediate attention.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Gender", "Academic"]
    },
    {
        "level": 2,
        "title": "Sexual Harassment",
        "desc_for_teacher": "I received multiple reports about inappropriate comments during class discussions.",
        "desc_for_student": "During group projects, I witnessed some behaviors that made me uncomfortable.",
        "desc_for_guard": "The situation in the classroom is deteriorating.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 2,
        "title": "Power Dynamics",
        "desc_for_teacher": "A faculty member has been accused.",
        "desc_for_student": "During private meetings, my advisor always tries to get too close to me.",
        "desc_for_guard": "The office, why are people still here at midnight.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 1,
        "title": "Social Media Harassment",
        "desc_for_teacher": "Students report receiving inappropriate messages from classmates on social media.",
        "desc_for_student": "I received uncomfortable private messages and comments on my social media.",
        "desc_for_guard": "Online harassment incidents are increasing, need immediate attention.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Digital", "Harassment"]
    },
    {
        "level": 2,
        "title": "Retaliation Concerns",
        "desc_for_teacher": "A student's academic performance has recently declined significantly.",
        "desc_for_student": "After witnessing and reporting harassment, I'm worried if I can pass this course.",
        "desc_for_guard": "A potential retaliation case has been discovered, needs immediate investigation.",
        "needs": {"support": 2, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 2,
        "title": "Unequal Resources",
        "desc_for_teacher": "I notice some students are consistently not allocated equipment.",
        "desc_for_student": "My equipment request was placed last again.",
        "desc_for_guard": "Resource allocation disputes in the lab need mediation.",
        "needs": {"policy": 1},
        "tags": ["Gender"]
    },
    {
        "level": 1,
        "title": "Gender Identity",
        "desc_for_teacher": "A male student in class seems to be called Anna.",
        "desc_for_student": "You can't come into the men's bathroom, get out, they pushed me violently.",
        "desc_for_guard": "There seems to be a violent incident in the school bathroom.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Identity"]
    },
    {
        "level": 2,
        "title": "Publication Bias",
        "desc_for_teacher": "I notice missing authorship and citations in papers.",
        "desc_for_student": "When can I publish my own paper?",
        "desc_for_guard": "There seems to be someone in the teaching building?!",
        "needs": {"support": 1},
        "tags": ["Academic"]
    },
    {
        "level": 2,
        "title": "Cultural Sensitivity",
        "desc_for_teacher": "A student from a small country transferred in, their emails always have many abbreviations.",
        "desc_for_student": "They say I smell strange, I feel excluded from group activities.",
        "desc_for_guard": "The classroom, why is someone wearing so many layers in summer.",
        "needs": {"support": 1},
        "tags": ["Cultural"]
    },
    {
        "level": 1,
        "title": "Stalking Behavior",
        "desc_for_teacher": "A student reports being followed and monitored.",
        "desc_for_student": "Everywhere I go, I always meet the same person.",
        "desc_for_guard": "Why are students still in pairs on campus at midnight, they must be good friends.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 1,
        "title": "Consent Education",
        "desc_for_teacher": "I notice students lack understanding of consent in academic settings.",
        "desc_for_student": "I'm not sure what behavior is appropriate.",
        "desc_for_guard": "There's a dispute in the classroom that needs handling.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Harassment"]
    }
];

// Action cards definition
const actionCards = [
    // Teacher cards
    {
        "type": "teacher",
        "title": "Gender Equity Policy",
        "effect": "Implement comprehensive gender equity policies",
        "effect_type": "policy",
        "tags": ["Gender", "Academic"]
    },
    {
        "type": "teacher",
        "title": "Anti-Harassment Training",
        "effect": "Conduct mandatory anti-harassment training",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    {
        "type": "teacher",
        "title": "Power Dynamics Training",
        "effect": "Implement training on appropriate faculty-student boundaries",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    // Student cards
    {
        "type": "student",
        "title": "Peer Support Network",
        "effect": "Establish peer support system",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "student",
        "title": "Student Advocacy",
        "effect": "Create student-led support network",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Academic Support Group",
        "effect": "Form study and support groups",
        "effect_type": "support",
        "tags": ["Academic"]
    },
    // Guard cards
    {
        "type": "guard",
        "title": "Safe Space Initiative",
        "effect": "Create designated safe spaces",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "guard",
        "title": "Investigation Protocol",
        "effect": "Implement thorough investigation procedures",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "guard",
        "title": "Campus Safety",
        "effect": "Enhance campus security measures",
        "effect_type": "support",
        "tags": ["General"]
    }
];

function resetGameState() {
    console.log('Resetting game state');
    gameState = {
        pressure: 0,
        max_pressure: 10,
        active_crises: [],
        current_player: 1,
        players: [],
        started: false,
        failed: false,
        used_crisis_cards: []
    };
    console.log('Game state reset complete');
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // 如果游戏已经结束或没有玩家，重置游戏状态
    if (gameState.failed || gameState.players.length === 0) {
        console.log('Game ended or empty, resetting game state');
        resetGameState();
    }

    // 检查是否已经有相同socket_id的玩家
    const existingPlayer = gameState.players.find(p => p.socket_id === socket.id);
    if (existingPlayer) {
        console.log(`Player ${existingPlayer.id} reconnected`);
        socket.emit('player_connected', {
            player_id: existingPlayer.id,
            total_players: gameState.players.length
        });
        socket.emit('game_state', getPlayerView(existingPlayer.id));
        return;
    }

    // 如果游戏已开始且玩家数量达到3人，拒绝新连接
    if (gameState.started && gameState.players.length >= 3) {
        console.log('Game is full, rejecting connection');
        socket.emit('error', { message: 'Game is full' });
        socket.disconnect(true);
        return;
    }

    const playerId = String(Math.floor(Math.random() * 9000) + 1000);
    const playerColor = ['#4CAF50', '#2196F3', '#FF9800'][gameState.players.length];
    
    const newPlayer = {
        id: playerId,
        hand: [],
        color: playerColor,
        role: '',
        socket_id: socket.id,
        has_played_this_turn: false,
        lastSeen: Date.now()
    };

    gameState.players.push(newPlayer);
    console.log(`Player ${playerId} joined the game, current players: ${gameState.players.length}`);

    // 发送连接成功消息
    socket.emit('player_connected', {
        player_id: playerId,
        total_players: gameState.players.length
    });

    // 发送游戏状态
    socket.emit('game_state', getPlayerView(playerId));
    
    // 广播新玩家加入
    socket.broadcast.emit('player_connected', {
        total_players: gameState.players.length
    });

    // 如果达到3个玩家，自动开始游戏
    if (gameState.players.length === 3) {
        console.log('Starting game with 3 players');
        autoStartGame(io);
    }

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const playerIndex = gameState.players.findIndex(p => p.socket_id === socket.id);
        if (playerIndex !== -1) {
            const player = gameState.players[playerIndex];
            console.log(`Player ${player.id} left the game`);
            gameState.players.splice(playerIndex, 1);
            io.emit('player_connected', { total_players: gameState.players.length });
            
            // 如果所有玩家都离开了，重置游戏状态
            if (gameState.players.length === 0) {
                console.log('All players left, resetting game state');
                resetGameState();
            }
        }
    });

    socket.on('play_card', (data) => {
        handlePlayCard(data, io);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

function autoStartGame(io) {
    console.log("Auto starting game");
    const roles = [...AVAILABLE_ROLES];
    roles.sort(() => Math.random() - 0.5);

    gameState.players.forEach((player, index) => {
        player.role = roles[index];
        player.has_played_this_turn = false;
        player.hand = dealHandForRole(player.role);
        console.log(`Assigned role ${roles[index]} to player ${player.id}`);
    });

    gameState.started = true;
    gameState.pressure = 0;
    gameState.used_crisis_cards = [];
    
    const availableCrisis = crisisCards.filter(card => !gameState.used_crisis_cards.includes(card.title));
    if (availableCrisis.length > 0) {
        const newCrisis = availableCrisis[Math.floor(Math.random() * availableCrisis.length)];
        gameState.active_crises = [newCrisis];
        gameState.used_crisis_cards.push(newCrisis.title);
        console.log(`Selected crisis: ${newCrisis.title}`);
    } else {
        gameState.used_crisis_cards = [];
        const newCrisis = crisisCards[Math.floor(Math.random() * crisisCards.length)];
        gameState.active_crises = [newCrisis];
        gameState.used_crisis_cards.push(newCrisis.title);
        console.log(`Reset crisis deck. Selected crisis: ${newCrisis.title}`);
    }

    // 通知所有玩家游戏开始
    gameState.players.forEach(player => {
        io.to(player.socket_id).emit('game_state', getPlayerView(player.id));
    });
}

function dealHandForRole(role) {
    console.log(`Dealing cards for role: ${role}`);
    const types = ROLE_CARD_TYPES[role] || [];
    const pool = actionCards.filter(card => types.includes(card.type));
    
    console.log(`Found ${pool.length} cards for role ${role}`);
    
    // 确保每个角色都能获得3张卡牌
    if (pool.length < 3) {
        console.error(`Not enough cards for role ${role}. Found ${pool.length} cards.`);
        return [];
    }
    
    // 随机选择3张卡牌，确保包含不同类型的卡牌
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const hand = shuffled.slice(0, 3);
    console.log(`Dealt cards for ${role}:`, hand.map(card => card.title));
    return hand;
}

function getPlayerView(playerId) {
    const state = {
        pressure: gameState.pressure,
        max_pressure: gameState.max_pressure,
        active_crises: [],
        current_player: gameState.current_player,
        players: [],
        started: gameState.started,
        failed: gameState.failed
    };

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    
    for (const crisis of gameState.active_crises) {
        if (currentPlayer) {
            const role = currentPlayer.role;
            const descs = {
                'Teacher': crisis.desc_for_teacher,
                'Student': crisis.desc_for_student,
                'Guard': crisis.desc_for_guard
            };
            state.active_crises.push({
                level: crisis.level,
                title: crisis.title,
                desc_for_teacher: role === 'Teacher' ? descs.Teacher : '****',
                desc_for_student: role === 'Student' ? descs.Student : '****',
                desc_for_guard: role === 'Guard' ? descs.Guard : '****',
                needs: crisis.needs
            });
        }
    }

    for (const p of gameState.players) {
        if (p.id === playerId) {
            state.players.push({
                id: p.id,
                role: p.role,
                hand: p.hand,
                color: p.color,
                has_played_this_turn: p.has_played_this_turn
            });
        } else {
            state.players.push({
                id: p.id,
                role: p.role,
                hand_count: p.hand.length,
                color: p.color,
                has_played_this_turn: p.has_played_this_turn
            });
        }
    }

    return state;
}

function handlePlayCard(data, io) {
    const { player_id, card_index } = data;
    const player = gameState.players.find(p => p.id === player_id);

    if (!player || player.has_played_this_turn) {
        console.log(`Player ${player_id} cannot play card: already played or not found`);
        return;
    }

    if (card_index < 0 || card_index >= player.hand.length) {
        console.log(`Invalid card index ${card_index} for player ${player_id}`);
        return;
    }

    const card = player.hand[card_index];
    const crisis = gameState.active_crises[0];
    
    if (!crisis) {
        console.log('No active crisis');
        return;
    }

    console.log(`Player ${player_id} (${player.role}) playing card:`, card.title);
    console.log('Current crisis:', crisis.title);
    console.log('Crisis needs:', crisis.needs);

    // 检查卡牌是否匹配危机需求
    const tagMatch = card.tags.some(tag => crisis.tags.includes(tag)) || card.tags.includes("General");
    const effectType = card.effect_type;
    
    if (tagMatch && crisis.needs[effectType] > 0) {
        crisis.needs[effectType] = Math.max(0, crisis.needs[effectType] - 1);
        console.log(`Reduced ${effectType} need to ${crisis.needs[effectType]}`);
    } else {
        gameState.pressure += 1;
        console.log(`Card doesn't match crisis needs, pressure increased to ${gameState.pressure}`);
    }

    // 移除已使用的卡牌
    player.hand.splice(card_index, 1);
    player.has_played_this_turn = true;

    // 检查危机是否已解决
    const allNeedsResolved = Object.values(crisis.needs).every(v => v === 0);
    console.log('Current crisis needs:', crisis.needs);
    console.log('All needs resolved:', allNeedsResolved);

    if (allNeedsResolved) {
        console.log('Crisis resolved, moving to next crisis');
        gameState.active_crises.shift();
        
        // 选择新的危机卡
        const availableCrisis = crisisCards.filter(card => !gameState.used_crisis_cards.includes(card.title));
        if (availableCrisis.length > 0) {
            const nextCrisis = availableCrisis[Math.floor(Math.random() * availableCrisis.length)];
            gameState.active_crises.push(nextCrisis);
            gameState.used_crisis_cards.push(nextCrisis.title);
            console.log(`New crisis: ${nextCrisis.title}`);
        } else {
            gameState.used_crisis_cards = [];
            const nextCrisis = crisisCards[Math.floor(Math.random() * crisisCards.length)];
            gameState.active_crises.push(nextCrisis);
            gameState.used_crisis_cards.push(nextCrisis.title);
            console.log(`Reset crisis deck. New crisis: ${nextCrisis.title}`);
        }

        // 给所有玩家发新卡
        gameState.players.forEach(p => {
            p.has_played_this_turn = false;
            p.hand = dealHandForRole(p.role);
            console.log(`Player ${p.id} (${p.role}) received new hand with ${p.hand.length} cards`);
        });
    }

    // 检查是否所有玩家都已出牌
    const allPlayed = gameState.players.every(p => p.has_played_this_turn);
    if (allPlayed && !allNeedsResolved) {
        console.log('All players played but crisis not resolved, increasing pressure');
        gameState.pressure += 2;
        gameState.players.forEach(p => {
            p.has_played_this_turn = false;
            p.hand = dealHandForRole(p.role);
            console.log(`Player ${p.id} (${p.role}) received new hand with ${p.hand.length} cards`);
        });
    }

    gameState.failed = gameState.pressure >= gameState.max_pressure;
    if (gameState.failed) {
        console.log('Game failed due to pressure reaching maximum');
    }

    // 更新所有玩家的游戏状态
    gameState.players.forEach(player => {
        io.to(player.socket_id).emit('game_state', getPlayerView(player.id));
    });
}

// Error handling
server.on('error', (error) => {
    console.error('Server error:', error);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 