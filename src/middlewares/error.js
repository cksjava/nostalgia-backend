function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const status = err && err.status ? Number(err.status) : 500;

  // Avoid leaking internals in production
  const payload = {
    error: err && err.message ? err.message : "Internal Server Error",
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err && err.stack ? err.stack : undefined;
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };
