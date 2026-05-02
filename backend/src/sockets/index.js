const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const logger = require('../utils/logger');

function buildRoom(a, b) {
  return [String(a), String(b)].sort().join(':');
}

const onlineUsers = new Map(); // userId -> Set<socketId>

module.exports = function registerSockets(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');

      if (!token) return next(new Error('Auth required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role, name: payload.name };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    socket.join(`user:${userId}`);
    io.emit('presence:update', { userId, online: true });

    socket.on('chat:join', ({ peerId }) => {
      if (!peerId) return;
      const room = buildRoom(userId, peerId);
      socket.join(room);
      socket.emit('chat:joined', { room });
    });

    socket.on('chat:typing', ({ peerId, typing }) => {
      const room = buildRoom(userId, peerId);
      socket.to(room).emit('chat:typing', { from: userId, typing: !!typing });
    });

    socket.on('chat:message', async ({ peerId, content, attachmentUrl }, cb) => {
      try {
        if (!peerId || (!content && !attachmentUrl)) {
          return cb?.({ error: 'invalid message' });
        }
        const room = buildRoom(userId, peerId);
        const msg = await Message.create({
          room,
          sender: userId,
          receiver: peerId,
          content: content || '',
          attachmentUrl,
        });
        io.to(room).emit('chat:message', msg.toObject());
        io.to(`user:${peerId}`).emit('chat:notify', {
          from: userId,
          preview: (content || 'Sent an attachment').slice(0, 80),
        });
        cb?.({ ok: true, message: msg });
      } catch (err) {
        logger.error('chat:message failed', err.message);
        cb?.({ error: 'failed' });
      }
    });

    socket.on('chat:seen', async ({ peerId }) => {
      const room = buildRoom(userId, peerId);
      await Message.updateMany(
        { room, receiver: userId, seen: false },
        { $set: { seen: true, seenAt: new Date() } }
      );
      socket.to(room).emit('chat:seen', { by: userId });
    });

    // Whiteboard sync — broadcast strokes to everyone in the room.
    socket.on('whiteboard:join', ({ room }) => {
      if (room) socket.join(`wb:${room}`);
    });

    socket.on('whiteboard:toggle', ({ room, open }) => {
      if (!room) return;
      socket.to(`wb:${room}`).emit('whiteboard:toggle', { open: !!open, from: userId });
    });

    socket.on('whiteboard:stroke', ({ room, stroke }) => {
      if (!room || !stroke) return;
      socket.to(`wb:${room}`).emit('whiteboard:stroke', { stroke, from: userId });
    });

    socket.on('whiteboard:clear', ({ room }) => {
      if (!room) return;
      socket.to(`wb:${room}`).emit('whiteboard:clear', { from: userId });
    });

    socket.on('disconnect', () => {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (!set.size) {
          onlineUsers.delete(userId);
          io.emit('presence:update', { userId, online: false });
        }
      }
    });
  });
};
