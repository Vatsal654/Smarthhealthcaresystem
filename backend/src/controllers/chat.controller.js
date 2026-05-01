const Message = require('../models/Message');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.peer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('name email avatarUrl role')
    .lean();
  if (!user) throw ApiError.notFound('User not found');
  let doctor = null;
  if (user.role === 'doctor') {
    doctor = await Doctor.findOne({ user: user._id }).lean();
  }
  res.json({ user, doctor });
});

function buildRoom(a, b) {
  return [String(a), String(b)].sort().join(':');
}

exports.history = asyncHandler(async (req, res) => {
  const { with: peerId, limit = 100 } = req.query;
  if (!peerId) throw ApiError.badRequest('with=userId required');
  const room = buildRoom(req.user.id, peerId);

  const messages = await Message.find({ room })
    .sort({ createdAt: 1 })
    .limit(Number(limit))
    .lean();
  res.json({ room, messages });
});

exports.threads = asyncHandler(async (req, res) => {
  const me = req.user.id;

  const recent = await Message.aggregate([
    { $match: { $or: [{ sender: toObjId(me) }, { receiver: toObjId(me) }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$room',
        lastMessage: { $first: '$$ROOT' },
      },
    },
    { $limit: 50 },
  ]);

  const peers = recent.map((r) => {
    const other = String(r.lastMessage.sender) === me ? r.lastMessage.receiver : r.lastMessage.sender;
    return { room: r._id, peer: other, lastMessage: r.lastMessage };
  });

  const peerUsers = await User.find({ _id: { $in: peers.map((p) => p.peer) } })
    .select('name email avatarUrl role')
    .lean();
  const map = new Map(peerUsers.map((u) => [String(u._id), u]));
  const threads = peers.map((p) => ({ ...p, peer: map.get(String(p.peer)) || { _id: p.peer } }));

  res.json({ threads });
});

function toObjId(id) {
  const mongoose = require('mongoose');
  return new mongoose.Types.ObjectId(id);
}
