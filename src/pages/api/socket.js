import { Server } from 'socket.io';
import { initSocket } from './game.js';

let io;

export default function SocketHandler(req, res) {
    if (!io) {
        const server = res.socket.server;
        io = new Server(server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        // Initialize game socket handlers
        initSocket(io);
    }

    res.end();
}

export const config = {
    api: {
        bodyParser: false
    }
}; 