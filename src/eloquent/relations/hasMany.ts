import HasOneOrMany from './hasOneOrMany';
import { is_null } from '@ostro/support/function';

/**
 * Class HasMany.
 */
class HasMany extends HasOneOrMany {

    /**
     * getResults method.
     * @returns {any}
     */
    public getResults() {
        return !is_null(this.getParentKey()) ?
            this.$query.get() :
            this.$related.newCollection();
    }

    /**
     * initRelation method.
     * @param {*} $models
     * @param {*} $relation
     * @returns {any}
     */
    public initRelation($models: any, $relation: any) {
        for (let $model of $models) {
            $model.setRelation($relation, this.$related.newCollection());
        }

        return $models;
    }

    /**
     * match method.
     * @param {*} $models
     * @param {*} $results
     * @param {*} $relation
     * @returns {any}
     */
    public match($models: any, $results: any, $relation: any) {
        return this.matchMany($models, $results, $relation);
    }
}

export default HasMany;