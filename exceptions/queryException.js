const queryExceptionContract = require('@ostro/contracts/exception/queryException')
class queryException extends queryExceptionContract {
    constructor(message) {
        super();
        this.name = this.constructor.name;
        this.code = 'SQLITE_ERROR';
        this.message = message || 'Invalid query';
        this.statusCode = 500
        Error.captureStackTrace(this, this.constructor);
    }
}
module.exports = queryException