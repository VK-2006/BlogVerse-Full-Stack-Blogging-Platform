export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} was not found.`
  });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists."
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error."
  });
}
