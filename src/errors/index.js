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

class ProviderError extends AppError {
  constructor(message = 'Provider error', options = {}) {
    const { statusCode = 502, code = 'PROVIDER_ERROR', details, retryable = false } = options || {};
    super(message, statusCode, code, details);
    this.retryable = retryable;
  }
}

module.exports = {
  AppError,
  SignatureVerificationError,
  ProviderError,
};
