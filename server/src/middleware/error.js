export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });

export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "CastError") { status = 400; message = "Invalid ID format"; }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue).join(", ")}`;
  }
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = `File too large. Max ${process.env.MAX_FILE_MB || 2} MB`;
  }

  if (process.env.NODE_ENV !== "production") console.error(err);
  res.status(status).json({ success: false, message });
};
