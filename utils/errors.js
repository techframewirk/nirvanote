class UserAlreadyExistsError extends Error {
    constructor(message) {
    super(message);
    this.name = 'UserAlreadyExistsError';
    }
}

module.exports = {
    UserAlreadyExistsError
}