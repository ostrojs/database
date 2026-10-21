import { get_class_name } from '@ostro/support/function';

/**
 * Class RelationNotFoundException.
 */
class RelationNotFoundException extends Error {
    public code: string;
    public statusCode: number;
    $model?: string;
    $relation?: string;

    /**
     * Create a new instance.
     *
     * @param message - Exception message.
     */
    constructor(message: string) {
        super(message || 'Invalid Argument');
        this.name = this.constructor.name;
        this.code = 'ERR_INVALID_ARG_VALUE';
        this.statusCode = 500;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Create a new exception with a standardized message.
     *
     * @param model - Model instance or class name.
     * @param relation - Relation name.
     * @returns New exception instance.
     */
    static make(model: any, relation: string): RelationNotFoundException {
        const className: string = get_class_name(model);

        const instance = new this(`Call to undefined relationship [${relation}] on model [${className}].`);

        instance.$model = className;
        instance.$relation = relation;

        return instance;
    }
}

export default RelationNotFoundException;