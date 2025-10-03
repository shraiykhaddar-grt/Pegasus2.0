class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR', details) {
    super(message);
    this.name = this.constructor.name;
    this.status = statusCode;
    this.statusCode = statusCode;
    this.code = code;
    if (details) this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class SignatureVerificationError extends AppError {
  constructor(message = 'Signature verification failed', details) {
    super(message, 400, 'SIGNATURE_VERIFICATION_FAILED', details);
  }
}

module.exports = {
  AppError,
  SignatureVerificationError,
};
