import { last } from '@ostro/support/function';

/**
 * Class CanBeOneOfMany.
 */
class CanBeOneOfMany {
    [key: string]: any;
    $isOneOfMany = false;

    /**
     * getRelationQuery method.
     * @returns {any}
     */
    public getRelationQuery() {
        return this.isOneOfMany() ?
            this.$oneOfManySubQuery :
            this.$query;
    }

    /**
     * getOneOfManySubQuery method.
     * @returns {any}
     */
    public getOneOfManySubQuery() {
        return this.$oneOfManySubQuery;
    }

    /**
     * qualifySubSelectColumn method.
     * @param {*} $column
     * @returns {any}
     */
    public qualifySubSelectColumn($column: string) {
        return this.getRelationName() + '.' + last($column.split('.'));
    }

    /**
     * qualifyRelatedColumn method.
     * @param {*} $column
     * @returns {any}
     */
    public qualifyRelatedColumn($column: string) {
        return $column.includes('.') ? $column : this.$query.getModel().getTable() + '.' + $column;
    }

    /**
     * isOneOfMany method.
     * @returns {any}
     */
    public isOneOfMany() {
        return this.$isOneOfMany === true;
    }

    /**
     * getRelationName method.
     * @returns {any}
     */
    public getRelationName() {
        return this.$relationName;
    }
}

export default CanBeOneOfMany;