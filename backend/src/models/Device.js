import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const deviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    deviceId: { type: String, required: true, unique: true, index: true },
    team: { type: String, enum: ['A', 'B'], required: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    lastSeen: { type: Date, default: null },
    rssi: { type: Number, default: null },
    snr: { type: Number, default: null },
    firmware: { type: String, default: null, maxlength: 20 },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Device = model('Device', deviceSchema);
