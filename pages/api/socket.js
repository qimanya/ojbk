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

        // 初始化 socket 事件，所有状态都用 Firestore 持久化
        initSocket(io);
    }

    res.end();
}

export const config = {
    api: {
        bodyParser: false
    }
}; 