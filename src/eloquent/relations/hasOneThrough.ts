import { implement, isset } from '@ostro/support/function';
import HasManyThrough from './hasManyThrough';
import SupportsDefaultModels from './concerns/supportsDefaultModels';
import InteractsWithDictionary from './concerns/interactsWithDictionary';
/**
 * Class HasOneThrough.
 */
class HasOneThrough extends implement(HasManyThrough, SupportsDefaultModels, InteractsWithDictionary) {
    /**
     * getResults method.
     * @async
     * @returns {any}
     */
    public async getResults() {
        return (await this.$query.first()) || this.getDefaultFor(this.$farParent);
    }

    /**
     * initRelation method.
     * @param {*} $models
     * @param {*} $relation
     * @returns {any}
     */
    public initRelation($models: any, $relation: any) {
        for (let $model of $models) {
            $model.setRelation($relation, this.getDefaultFor($model));
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
        let $dictionary = this.buildDictionary($results);

        for (let $model of $models) {
            let $key = this.getDictionaryKey($model.getAttribute(this.$localKey))
            if (isset($dictionary[$key])) {
                let $value = $dictionary[$key];
                $value =  Array.isArray($value) && $value.length > 0 ?  $value[0] : null;
                $model.setRelation(
                    $relation,  $value
                );
            }
        }

        return $models;
    }

    /**
     * newRelatedInstanceFor method.
     * @param {*} $parent
     * @returns {any}
     */
    public newRelatedInstanceFor($parent: any) {
        return this.$related.newInstance();
    }
}

export default HasOneThrough;
