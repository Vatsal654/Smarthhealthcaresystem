const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String },
    seen: { type: Boolean, default: false },
    seenAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
