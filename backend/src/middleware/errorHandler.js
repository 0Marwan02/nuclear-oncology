const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
};

module.exports = { notFoundHandler, errorHandler };
