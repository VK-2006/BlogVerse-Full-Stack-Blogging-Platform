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

  const status = Number(error.status) || 500;
  const productionMessage = status >= 500 && process.env.NODE_ENV === "production"
    ? "Internal server error."
    : error.message || "Internal server error.";

  res.status(status).json({
    success: false,
    message: productionMessage
  });
}
