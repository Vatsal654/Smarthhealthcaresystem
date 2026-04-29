const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    logger.error(err);
  }

  res.status(status).json({
    error: {
      message: err.message || 'Something went wrong',
      details: err.details || undefined,
    },
  });
};
