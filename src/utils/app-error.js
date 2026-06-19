class AppError extends Error {
  constructor(message, status = 400, publicMessage) {
    super(message);
    this.status = status;
    this.publicMessage = publicMessage || message;
  }
}

module.exports = {
  AppError,
};
