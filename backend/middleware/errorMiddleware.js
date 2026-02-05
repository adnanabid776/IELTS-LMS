const errorHandler = (err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    error: err.message || "Internal Server Error",
  });
};

module.exports = { errorHandler };
