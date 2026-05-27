// Wraps async route handlers so unhandled promise rejections are forwarded
// to Express's global error handler instead of crashing the server.
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
