function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultIsRetryable(err) {
  return !!(err && (err.retryable === true || err.code === 'PROVIDER_ERROR'));
}

async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    minDelayMs = 100,
    factor = 2,
    maxDelayMs = 2000,
    isRetryable = defaultIsRetryable,
    onRetry = () => {},
  } = options;

  let attempt = 0;
  let delay = minDelayMs;
  // attempts = retries + 1 (first + retries)
  while (true) {
    try {
      attempt += 1;
      return await fn(attempt);
    } catch (err) {
      const canRetry = attempt <= retries && isRetryable(err, attempt);
      if (!canRetry) throw err;
      try {
        onRetry(err, attempt, delay);
      } catch (_) {
        // ignore onRetry errors
      }
      await sleep(delay);
      delay = Math.min(maxDelayMs, delay * factor);
    }
  }
}

module.exports = { withRetry };
