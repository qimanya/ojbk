import { Server } from "socket.io";

let gameState = {
    pressure: 0,
    max_pressure: 10,
    active_crises: [],
    current_player: 1,
    players: [],
    started: false,
    failed: false
};

const AVAILABLE_ROLES = ['Student', 'Teacher', 'Guard'];

const crisisCards = [
    {
        "level": 1,
        "title": "Level 1 Crisis",
        "desc_for_teacher": "I notice a female student being rejected from advanced research opportunities.",
        "desc_for_student": "Someone suggests I should focus on more important things due to my gender.",
        "desc_for_guard": "An incident occurred in the research building that needs immediate attention.",
        "needs": {"support": 2, "policy": 1},
        "tags": ["Gender"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "I received multiple reports about inappropriate comments during class discussions.",
        "desc_for_student": "During group projects, I witnessed some behaviors that made me uncomfortable.",
        "desc_for_guard": "The situation in the classroom is deteriorating.",
        "needs": {"support": 2, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "A faculty member has been accused.",
        "desc_for_student": "During private meetings, my advisor always tries to get too close to me.",
        "desc_for_guard": "The office, why are people still here at midnight.",
        "needs": {"support": 2, "policy": 2},
        "tags": ["Harassment"]
    },
    {
        "level": 1,
        "title": "Level 1 Crisis",
        "desc_for_teacher": "Students report receiving inappropriate messages from classmates on social media.",
        "desc_for_student": "I received uncomfortable private messages and comments on my social media.",
        "desc_for_guard": "Online harassment incidents are increasing, need immediate attention.",
        "needs": {"support": 1, "policy": 1},
        "tags": ["Digital", "Harassment"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "A student's academic performance has recently declined significantly.",
        "desc_for_student": "After witnessing and reporting harassment, I'm worried if I can pass this course.",
        "desc_for_guard": "A potential retaliation case has been discovered, needs immediate investigation.",
        "needs": {"support": 3, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "I notice some students are consistently not allocated equipment.",
        "desc_for_student": "My equipment request was placed last again.",
        "desc_for_guard": "Resource allocation disputes in the lab need mediation.",
        "needs": {"policy": 2},
        "tags": ["Gender"]
    },
    {
        "level": 1,
        "title": "Level 1 Crisis",
        "desc_for_teacher": "A male student in class seems to be called Anna.",
        "desc_for_student": "You can't come into the men's bathroom, get out, they pushed me violently.",
        "desc_for_guard": "There seems to be a violent incident in the school bathroom.",
        "needs": {"support": 2, "policy": 1},
        "tags": ["Identity"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "I notice missing authorship and citations in papers.",
        "desc_for_student": "When can I publish my own paper?",
        "desc_for_guard": "There seems to be someone in the teaching building?!",
        "needs": {"support": 3},
        "tags": ["Academic"]
    },
    {
        "level": 2,
        "title": "Level 2 Crisis",
        "desc_for_teacher": "A student from a small country transferred in, their emails always have many abbreviations.",
        "desc_for_student": "They say I smell strange, I feel excluded from group activities.",
        "desc_for_guard": "The classroom, why is someone wearing so many layers in summer.",
        "needs": {"support": 2},
        "tags": ["Cultural"]
    },
    {
        "level": 1,
        "title": "Level 1 Crisis",
        "desc_for_teacher": "A student reports being followed and monitored.",
        "desc_for_student": "Everywhere I go, I always meet the same person.",
        "desc_for_guard": "Why are students still in pairs on campus at midnight, they must be good friends.",
        "needs": {"support": 2, "policy": 1},
        "tags": ["Harassment"]
    },
    {
        "level": 1,
        "title": "Level 1 Crisis",
        "desc_for_teacher": "I notice students lack understanding of consent in academic settings.",
        "desc_for_student": "I'm not sure what behavior is appropriate.",
        "desc_for_guard": "There's a dispute in the classroom that needs handling.",
        "needs": {"support": 1, "policy": 2},
        "tags": ["Harassment"]
    }
];

const actionCards = [
    {
        "type": "teacher",
        "title": "Gender Equity Policy",
        "effect": "Implement comprehensive gender equity policies",
        "effect_type": "policy",
        "tags": ["Gender"]
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
    {
        "type": "teacher",
        "title": "Social Media Policy",
        "effect": "Establish guidelines for online interactions",
        "effect_type": "policy",
        "tags": ["Digital", "Harassment"]
    },
    {
        "type": "teacher",
        "title": "Anti-Retaliation Policy",
        "effect": "Implement measures to prevent retaliation",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    {
        "type": "special",
        "title": "Title IX Review",
        "effect": "Convene Title IX compliance review",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "student",
        "title": "Peer Support Network",
        "effect": "Establish peer support system",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "student",
        "title": "Peer Support Hotline",
        "effect": "Establish confidential support system for victims",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Digital Safety Workshop",
        "effect": "Provide training on online safety and privacy",
        "effect_type": "support",
        "tags": ["Digital", "Harassment"]
    },
    {
        "type": "student",
        "title": "Advocacy Network",
        "effect": "Create student-led support network",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "teacher",
        "title": "Academic Equity Review",
        "effect": "Review academic policies for equity",
        "effect_type": "policy",
        "tags": ["Academic"]
    },
    {
        "type": "teacher",
        "title": "Inclusive Language Policy",
        "effect": "Implement inclusive language guidelines",
        "effect_type": "policy",
        "tags": ["Identity"]
    },
    {
        "type": "teacher",
        "title": "Cultural Competency Training",
        "effect": "Provide cultural competency education",
        "effect_type": "policy",
        "tags": ["Cultural"]
    },
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
        "title": "Digital Evidence Collection",
        "effect": "Establish procedures for handling digital evidence",
        "effect_type": "support",
        "tags": ["Digital", "Harassment"]
    },
    {
        "type": "guard",
        "title": "Retaliation Prevention",
        "effect": "Monitor and prevent potential retaliation",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Student Advocacy",
        "effect": "Organize student advocacy group",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "student",
        "title": "Cultural Exchange",
        "effect": "Promote cross-cultural understanding",
        "effect_type": "support",
        "tags": ["Cultural"]
    },
    {
        "type": "teacher",
        "title": "Faculty Training",
        "effect": "Conduct faculty equity training",
        "effect_type": "policy",
        "tags": ["General"]
    },
    {
        "type": "teacher",
        "title": "Resource Allocation Policy",
        "effect": "Implement fair resource distribution",
        "effect_type": "policy",
        "tags": ["Gender"]
    },
    {
        "type": "teacher",
        "title": "Inclusive Curriculum",
        "effect": "Develop inclusive curriculum guidelines",
        "effect_type": "policy",
        "tags": ["Cultural"]
    },
    {
        "type": "teacher",
        "title": "Anonymous Reporting",
        "effect": "Establish anonymous reporting system",
        "effect_type": "policy",
        "tags": ["Academic"]
    },
    {
        "type": "student",
        "title": "Inclusive Dialogue",
        "effect": "Facilitate open discussions",
        "effect_type": "support",
        "tags": ["Identity"]
    },
    {
        "type": "student",
        "title": "Academic Support",
        "effect": "Provide academic assistance",
        "effect_type": "support",
        "tags": ["Academic"]
    },
    {
        "type": "student",
        "title": "Cultural Awareness",
        "effect": "Promote cultural understanding",
        "effect_type": "support",
        "tags": ["Cultural"]
    },
    {
        "type": "guard",
        "title": "Campus Safety",
        "effect": "Enhance campus security measures",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "guard",
        "title": "Conflict Resolution",
        "effect": "Mediate conflicts effectively",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "guard",
        "title": "Digital Safety",
        "effect": "Monitor online harassment",
        "effect_type": "support",
        "tags": ["Digital"]
    },
    {
        "type": "guard",
        "title": "Emergency Response",
        "effect": "Implement emergency protocols",
        "effect_type": "support",
        "tags": ["Violence"]
    },
    {
        "type": "guard",
        "title": "Safe Reporting",
        "effect": "Ensure secure reporting process",
        "effect_type": "support",
        "tags": ["Identity"]
    },
    {
        "type": "guard",
        "title": "Prevention Training",
        "effect": "Conduct prevention workshops",
        "effect_type": "support",
        "tags": ["General"]
    },
    {
        "type": "guard",
        "title": "Online Protection",
        "effect": "Implement digital safety measures",
        "effect_type": "support",
        "tags": ["Digital"]
    },
    {
        "type": "guard",
        "title": "Mental Health Support",
        "effect": "Provide mental health resources",
        "effect_type": "support",
        "tags": ["MentalHealth"]
    },
    {
        "type": "teacher",
        "title": "Classroom Conduct Policy",
        "effect": "Establish clear guidelines for classroom behavior",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    {
        "type": "teacher",
        "title": "Consent Education Program",
        "effect": "Implement comprehensive consent education",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    {
        "type": "teacher",
        "title": "Visitor Management Policy",
        "effect": "Establish guidelines for campus visitors",
        "effect_type": "policy",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Bystander Intervention Training",
        "effect": "Train students to safely intervene in harassment situations",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Safe Walk Program",
        "effect": "Establish campus escort service",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "student",
        "title": "Consent Workshop",
        "effect": "Organize student-led consent education",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "guard",
        "title": "Campus Access Control",
        "effect": "Implement visitor tracking system",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "guard",
        "title": "Stalking Prevention",
        "effect": "Establish stalking response protocol",
        "effect_type": "support",
        "tags": ["Harassment"]
    },
    {
        "type": "guard",
        "title": "Environmental Assessment",
        "effect": "Conduct campus safety audit",
        "effect_type": "support",
        "tags": ["Harassment"]
    }
];

const ROLE_CARD_TYPES = {
    'Teacher': ['policy', 'teacher'],
    'Student': ['support', 'student'],
    'Guard': ['support', 'guard']
};

export default function handler(req, res) {
    res.status(200).json({ message: "Game API" });
}

export const config = {
    api: {
        bodyParser: false,
    },
};

export function initSocket(server) {
    console.log('Creating Socket.IO server instance...');
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization']
        },
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        allowEIO3: true,
        maxHttpBufferSize: 1e8,
        cookie: {
            name: 'io',
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        }
    });

    io.engine.on("connection_error", (err) => {
        console.error("Connection error:", err);
    });

    io.engine.on("initial_headers", (headers, req) => {
        headers["Access-Control-Allow-Origin"] = "http://localhost:3000";
        headers["Access-Control-Allow-Credentials"] = "true";
    });

    io.engine.on("headers", (headers, req) => {
        headers["Access-Control-Allow-Origin"] = "http://localhost:3000";
        headers["Access-Control-Allow-Credentials"] = "true";
    });

    io.on("connection", (socket) => {
        console.log("New player connected:", socket.id);
        console.log("Current connected clients:", io.engine.clientsCount);
        
        // Send connection success message
        socket.emit('connection_success', {
            message: 'Successfully connected to game server',
            socketId: socket.id
        });

        if (gameState.players.length >= 3) {
            console.warn("Game is full, rejecting new connection");
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
            avatar: '',
            role: '',
            socket_id: socket.id,
            has_played_this_turn: false
        };

        gameState.players.push(newPlayer);
        console.log(`Player ${playerId} joined the game, current players: ${gameState.players.length}`);

        socket.emit('player_connected', {
            player_id: playerId,
            total_players: gameState.players.length
        });

        socket.emit('game_state', getPlayerView(playerId));
        socket.broadcast.emit('player_connected', {
            total_players: gameState.players.length
        });

        if (gameState.players.length === 3) {
            autoStartGame(io);
        }

        socket.on("disconnect", (reason) => {
            console.log(`Player disconnected: ${socket.id}, reason: ${reason}`);
            const playerIndex = gameState.players.findIndex(p => p.socket_id === socket.id);
            if (playerIndex !== -1) {
                gameState.players.splice(playerIndex, 1);
                io.emit('player_connected', { total_players: gameState.players.length });
            }
        });

        socket.on("play_card", (data) => {
            console.log(`Player ${data.player_id} playing card ${data.card_index}`);
            handlePlayCard(data, io);
        });

        socket.on("restart_game", () => {
            console.log("Restarting game...");
            // Reset game state
            gameState.pressure = 0;
            gameState.max_pressure = 10;
            gameState.active_crises = [];
            gameState.current_player = 1;
            gameState.started = false;
            gameState.failed = false;

            // Clear player list
            gameState.players = [];

            // Notify all clients that game has been reset
            io.emit('game_state', {
                pressure: 0,
                max_pressure: 10,
                active_crises: [],
                current_player: 1,
                players: [],
                started: false,
                failed: false
            });

            // Disconnect all connections
            io.sockets.sockets.forEach(s => {
                s.disconnect(true);
            });
        });

        socket.on("error", (error) => {
            console.error(`Socket error for player ${playerId}:`, error);
        });
    });

    return io;
}

function autoStartGame(io) {
    console.log("Auto starting game");
    const roles = [...AVAILABLE_ROLES];
    roles.sort(() => Math.random() - 0.5);

    gameState.players.forEach((player, index) => {
        player.role = roles[index];
        player.avatar = `avatar_${roles[index].toLowerCase()}.png`;
        player.has_played_this_turn = false;
    });

    gameState.started = true;
    gameState.active_crises = [crisisCards[Math.floor(Math.random() * crisisCards.length)]];
    
    gameState.players.forEach(player => {
        player.hand = dealHandForRole(player.role);
    });

    gameState.pressure = 0;
    console.log("Game started, roles assigned");

    gameState.players.forEach(player => {
        io.to(player.socket_id).emit('game_state', getPlayerView(player.id));
    });
}

function dealHandForRole(role) {
    const types = ROLE_CARD_TYPES[role] || [];
    const pool = actionCards.filter(card => types.includes(card.type));
    return pool.length >= 3 ? randomSample(pool, 3) : pool.slice(0, 3);
}

function randomSample(array, n) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
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
    
    // Process crisis cards
    for (const crisis of gameState.active_crises) {
        if (currentPlayer) {
            const role = currentPlayer.role;
            const descs = {
                'Teacher': crisis.desc_for_teacher,
                'Student': crisis.desc_for_student,
                'Guard': crisis.desc_for_guard
            };
            const crisisView = {
                level: crisis.level,
                title: crisis.title,
                desc_for_teacher: role === 'Teacher' ? descs.Teacher : '****',
                desc_for_student: role === 'Student' ? descs.Student : '****',
                desc_for_guard: role === 'Guard' ? descs.Guard : '****'
            };
            state.active_crises.push(crisisView);
        }
    }

    // Process player information
    for (const p of gameState.players) {
        if (p.id === playerId) {
            state.players.push({
                id: p.id,
                role: p.role,
                hand: p.hand,
                color: p.color,
                has_played_this_turn: p.has_played_this_turn || false
            });
        } else {
            state.players.push({
                id: p.id,
                role: p.role,
                hand_count: p.hand.length,
                color: p.color,
                has_played_this_turn: p.has_played_this_turn || false
            });
        }
    }

    return state;
}

function refillHand(player) {
    const roleTypes = ROLE_CARD_TYPES[player.role] || [];
    const pool = actionCards.filter(card => roleTypes.includes(card.type));
    const crisis = gameState.active_crises[0];
    const crisisTags = crisis ? crisis.tags : [];
    
    if (player.hand.length < 3 && pool.length && crisisTags.length) {
        const hasMatch = player.hand.some(card => 
            card.tags.some(tag => crisisTags.includes(tag))
        );
        
        if (!hasMatch) {
            const matchPool = pool.filter(card => 
                card.tags.some(tag => crisisTags.includes(tag))
            );
            if (matchPool.length) {
                player.hand.push(matchPool[Math.floor(Math.random() * matchPool.length)]);
            }
        }
    }
    
    while (player.hand.length < 3 && pool.length) {
        player.hand.push(pool[Math.floor(Math.random() * pool.length)]);
    }
}

function handlePlayCard(data, io) {
    const { player_id, card_index } = data;
    const player = gameState.players.find(p => p.id === player_id);

    if (!player || player.has_played_this_turn) {
        return;
    }

    if (card_index < 0 || card_index >= player.hand.length) {
        return;
    }

    const card = player.hand[card_index];
    const allowedTypes = ROLE_CARD_TYPES[player.role] || [];

    if (!allowedTypes.includes(card.type)) {
        return;
    }

    const crisis = gameState.active_crises[0];
    const tagMatch = crisis && (
        card.tags.some(tag => crisis.tags.includes(tag)) ||
        card.tags.includes("General")
    );

    player.hand.splice(card_index, 1);
    player.has_played_this_turn = true;

    if (tagMatch && crisis && card.effect_type) {
        Object.keys(crisis.needs).forEach(needType => {
            if (card.effect_type === needType && crisis.needs[needType] > 0) {
                crisis.needs[needType] = Math.max(0, crisis.needs[needType] - 1);
            }
        });
    }

    const allNeedsResolved = crisis && Object.values(crisis.needs).every(v => v === 0);
    if (allNeedsResolved) {
        gameState.active_crises.shift();
        if (crisisCards.length) {
            gameState.active_crises.push(crisisCards[Math.floor(Math.random() * crisisCards.length)]);
        }
        gameState.players.forEach(p => {
            p.has_played_this_turn = false;
            refillHand(p);
        });
    }

    const allPlayed = gameState.players.every(p => p.has_played_this_turn);
    if (allPlayed && crisis && !allNeedsResolved) {
        gameState.pressure += 2;
        gameState.players.forEach(p => {
            p.has_played_this_turn = false;
            refillHand(p);
        });
    }

    gameState.failed = gameState.pressure >= gameState.max_pressure;

    gameState.players.forEach(player => {
        io.to(player.socket_id).emit('game_state', getPlayerView(player.id));
    });
}
