import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'failed'];

const messageSchema = new Schema(
  {
    from: { type: String, required: true, index: true }, // sender deviceId
    to: { type: String, required: true, index: true }, // recipient deviceId
    fromTeam: { type: String, enum: ['A', 'B'], required: true },
    toTeam: { type: String, enum: ['A', 'B'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 240 },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'pending', index: true },
    failedReason: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ to: 1, status: 1 });

export const Message = model('Message', messageSchema);
