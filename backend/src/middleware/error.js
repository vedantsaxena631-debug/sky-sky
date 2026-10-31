import { HttpError } from '../utils/httpError.js';

export const notFound = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export function errorHandler(err, _req, res, _next) {
  let status = err.status && err.status < 600 ? err.status : 500;
  let message = err.message;

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }
  if (err.code === 11000) {
    status = 409;
    message = 'Duplicate record';
  }
  if (status === 500) {
    console.error(err);
    message = 'Internal server error';
  }

  res.status(status).json({ success: false, message, details: err.details });
}
