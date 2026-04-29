class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg || 'Bad request', details);
  }
  static unauthorized(msg) {
    return new ApiError(401, msg || 'Unauthorized');
  }
  static forbidden(msg) {
    return new ApiError(403, msg || 'Forbidden');
  }
  static notFound(msg) {
    return new ApiError(404, msg || 'Not found');
  }
  static conflict(msg) {
    return new ApiError(409, msg || 'Conflict');
  }
  static internal(msg) {
    return new ApiError(500, msg || 'Internal server error');
  }
}

module.exports = ApiError;
