import queryExceptionContract from '@ostro/contracts/exception/queryException';

/**
 * Class queryException.
 */
class queryException extends queryExceptionContract {
    public name: string;
    public code: string;
    public statusCode: number;
    declare message: string;

    /**
     * Create a new instance.
     *
     * @param message - Exception message.
     */
    constructor(message?: string) {
        super();
        this.name = this.constructor.name;
        this.code = 'SQL_ERROR';
        this.message = message || 'Invalid query';
        this.statusCode = 500;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default queryException;