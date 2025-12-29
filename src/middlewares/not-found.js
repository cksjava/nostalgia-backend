function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
}

module.exports = { notFoundHandler };
