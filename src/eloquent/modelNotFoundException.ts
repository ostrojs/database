import { get_class_name, count } from '@ostro/support/function';
/* c8 ignore next */
import ModelNotFoundExceptionContracts from '@ostro/contracts/database/eloquent/modelNotFoundException';

/**
 * Class ModelNotFoundException.
 */
class ModelNotFoundException extends ModelNotFoundExceptionContracts {
    public $model: any;
    public $ids: any[] = [];
    public name: string;
    public code: string;
    public statusCode: number;

    /**
     * Create a new instance.
     */
    constructor() {
        super();
        this.name = this.constructor.name;
        this.code = 'ERR_INVALID_ARG_VALUE';
        this.statusCode = 500;
    }

    /**
     * Set the affected Eloquent model and instance ids.
     *
     * @param model - Model instance or class name.
     * @param ids - Missing model ids.
     * @returns Fluent self instance.
     */
    public setModel(model: any, ids: any[] = []): this {
        this.$model = model;
        this.$ids = ids;

        this.message = `No query results for model [${get_class_name(model)}]`;

        if (count(this.$ids) > 0) {
            this.message += ' ' + this.$ids.join(', ');
        } else {
            this.message += '.';
        }

        return this;
    }

    /**
     * Get the affected Eloquent model.
     *
     * @returns Model instance.
     */
    public getModel(): any {
        return this.$model;
    }

    /**
     * Get the affected Eloquent model IDs.
     *
     * @returns Array of IDs.
     */
    public getIds(): any[] {
        return this.$ids;
    }
}

export default ModelNotFoundException;
