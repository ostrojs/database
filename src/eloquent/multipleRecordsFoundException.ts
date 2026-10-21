/**
 * Class MultipleRecordsFoundException.
 */
class MultipleRecordsFoundException extends Error {
    public code: string;
    public statusCode: number;

    /**
     * Create a new instance.
     *
     * @param count - Optional count of records found.
     */
    constructor(count: number | null = null) {
        let message = count 
            ? `${count} records were found.`
            : 'Multiple records were found.';
        super(message);
        this.name = this.constructor.name;
        this.code = 'ERR_MULTIPLE_RECORDS_FOUND';
        this.statusCode = 500;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default MultipleRecordsFoundException;
