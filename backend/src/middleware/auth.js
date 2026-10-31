import { Device } from '../models/Device.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { hashToken, safeEqual } from '../utils/crypto.js';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

const bearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const isOperator = (req) => safeEqual(req.headers['x-operator-key'], process.env.OPERATOR_API_KEY);

/** Admin-only: used by the register-device script, never by the browser. */
export const requireAdmin = (req, _res, next) => {
  if (!process.env.ADMIN_API_KEY) return next(new HttpError(500, 'ADMIN_API_KEY is not configured'));
  if (!safeEqual(req.headers['x-admin-key'], process.env.ADMIN_API_KEY)) {
    return next(new HttpError(401, 'Admin key invalid'));
  }
  return next();
};

/** Dashboard operator access. */
export const requireOperator = (req, _res, next) => {
  if (!process.env.OPERATOR_API_KEY) return next(new HttpError(500, 'OPERATOR_API_KEY is not configured'));
  if (!isOperator(req)) return next(new HttpError(401, 'Operator key invalid'));
  return next();
};

/** ESP32 device authentication: Bearer <64-hex token>. */
export const requireDevice = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!TOKEN_PATTERN.test(token)) throw new HttpError(401, 'Device token missing or malformed');

  const device = await Device.findOne({ tokenHash: hashToken(token), revoked: false });
  if (!device) throw new HttpError(401, 'Device token rejected');

  req.device = device;
  return next();
});

/** Sending: a device sends as itself, or the dashboard sends on behalf of a device. */
export const requireSenderAuth = (req, res, next) => {
  if (req.headers['x-operator-key'] && isOperator(req)) {
    req.viaOperator = true;
    return next();
  }
  return requireDevice(req, res, next);
};
