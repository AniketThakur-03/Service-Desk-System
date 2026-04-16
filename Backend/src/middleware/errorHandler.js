function errorHandler(err, req, res, next) { 
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";

  res.status(status).json({
    error: {
      code,
      message: err.message || "Something went wrong",
    },
  });
}

module.exports = { errorHandler };
