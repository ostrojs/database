import { Macroable } from '@ostro/support/macro';
import { is_null, get_class_name } from '@ostro/support/function';
import InteractsWithDictionary from './concerns/interactsWithDictionary';
import ModelNotFoundException from '../modelNotFoundException';
import MultipleRecordsFoundException from '../multipleRecordsFoundException';

/**
 * Class Relation.
 */
class Relation extends Macroable.implement(InteractsWithDictionary) {

    public $query: any = null;

    public $parent: any = null;

    public $related: any = null;

    public static $selfJoinCount: number = 0;

    public static $constraints: boolean = true;

    public static $morphMap: any = [];

    public $performQueries: any[] = [];

    /**
     * Create a new instance.
     * @param {*} $query
     * @param {*} $parent
     */
    constructor($query: any, $parent: any) {
        super()
        this.$query = $query;
        this.$parent = $parent;
        this.$related = $query.getModel();
    }

    /**
     * noConstraints method.
     * @static
     * @param {*} $callback
     * @returns {any}
     */
    static noConstraints($callback: Function) {
        let $previous = this.$constraints;

        this.$constraints = false;

        try {
            return $callback();
        } finally {
            this.$constraints = $previous;
        }
    }

    /**
     * addConstraints method.
     * @returns {any}
     */
    public addConstraints() {

    }

    /**
     * addEagerConstraints method.
     * @param {*} $models
     * @returns {any}
     */
    public addEagerConstraints($models: any) {

    }

    /**
     * initRelation method.
     * @param {*} $models
     * @param {*} $relation
     * @returns {any}
     */
    public initRelation($models: any, $relation: any) {

    }

    /**
     * match method.
     * @param {*} $models
     * @param {*} $results
     * @param {*} $relation
     * @returns {any}
     */
    public match($models: any, $results: any, $relation: any) {

    }

    /**
     * getResults method.
     * @returns {any}
     */
    public getResults() {

    }

    /**
     * getEager method.
     * @returns {any}
     */
    public getEager() {
        return this.get();
    }

    /**
     * sole method.
     * @async
     * @param {*} $columns
     * @returns {any}
     */
    public async sole($columns: any[] = ['*']) {
        const $result = await this.take(2).get($columns);

        if ($result.count() === 0) {
            throw (new ModelNotFoundException).setModel(this.$related);
        }

        if ($result.count() > 1) {
            throw new MultipleRecordsFoundException;
        }

        return $result.first();
    }

    /**
     * get method.
     * @returns {any}
     */
    get() {

        return this.$query.get();
    }

    /**
     * touch method.
     * @returns {any}
     */
    public touch() {
        let $model = this.getRelated();

        if (!$model.isIgnoringTouch()) {
            this.rawUpdate({
                [$model.getUpdatedAtColumn()]: $model.freshTimestampString(),
            } as any);
        }
    }

    /**
     * rawUpdate method.
     * @param {*} $attributes
     * @returns {any}
     */
    public rawUpdate($attributes: any = []) {
        return this.$query.withoutGlobalScopes().update($attributes);
    }

    /**
     * getRelationExistenceCountQuery method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @returns {any}
     */
    public getRelationExistenceCountQuery($query: any, $parentQuery: any) {
        return this.getRelationExistenceQuery(
            $query, $parentQuery, $query.raw('count(*)')
        );
    }

    /**
     * getRelationExistenceQuery method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @param {*} $columns
     * @returns {any}
     */
    public getRelationExistenceQuery($query: any, $parentQuery: any, $columns: any[] = ['*']) {
        return $query.select($columns).whereRaw(
            this.getQualifiedParentKeyName() + '=' + this.getExistenceCompareKey()
        );
    }

    /**
     * getRelationCountHash method.
     * @param {*} $incrementJoinCount
     * @returns {any}
     */
    public getRelationCountHash($incrementJoinCount: boolean = true) {

        return 'ostro_reserved_' + ($incrementJoinCount ? (this.constructor as any).$selfJoinCount++ : (this.constructor as any).$selfJoinCount);
    }

    /**
     * getKeys method.
     * @param {*} $models
     * @param {*} $key
     * @returns {any}
     */
    public getKeys($models: any, $key: any = null) {
        return $models.map(function ($value) {
            return $key ? $value.getAttribute($key) : $value.getKey();
        }).values().unique(null, true).sortBy().all();
    }

    /**
     * getRelationQuery method.
     * @returns {any}
     */
    public getRelationQuery() {
        return this.$query;
    }

    /**
     * getQuery method.
     * @returns {any}
     */
    public getQuery() {
        return this.$query;
    }

    /**
     * getBaseQuery method.
     * @returns {any}
     */
    public getBaseQuery() {
        return this.$query.getQuery();
    }

    /**
     * getParent method.
     * @returns {any}
     */
    public getParent() {
        return this.$parent;
    }

    /**
     * getQualifiedParentKeyName method.
     * @returns {any}
     */
    public getQualifiedParentKeyName() {
        return this.$parent.getQualifiedKeyName();
    }

    /**
     * getRelated method.
     * @returns {any}
     */
    public getRelated() {
        return this.$related;
    }

    /**
     * createdAt method.
     * @returns {any}
     */
    public createdAt() {
        return this.$parent.getCreatedAtColumn();
    }

    /**
     * updatedAt method.
     * @returns {any}
     */
    public updatedAt() {
        return this.$parent.getUpdatedAtColumn();
    }

    /**
     * relatedUpdatedAt method.
     * @returns {any}
     */
    public relatedUpdatedAt() {
        return this.$related.getUpdatedAtColumn();
    }

    /**
     * whereInEager method.
     * @param {*} $whereIn
     * @param {*} $key
     * @param {*} $modelKeys
     * @param {*} $query
     * @returns {any}
     */
    public whereInEager($whereIn: any, $key: string, $modelKeys: any, $query: any = null) {
        ($query ?? this.$query)[$whereIn]($key, $modelKeys);

        if ($modelKeys.length === 0) {
            this.$eagerKeysWereEmpty = true;
        }
    }

    /**
     * whereInMethod method.
     * @param {*} $model
     * @param {*} $key
     * @returns {any}
     */
    public whereInMethod($model: any, $key: string) {
        if ($model.getKeyName() === $key.split('.').pop() &&
            ['int', 'integer'].includes($model.getKeyType())) {
            return 'whereIntegerInRaw';
        } else {
            return 'whereIn';
        }
    }
    /**
     * setPerformQuery method.
     * @param {*} fn
     * @returns {any}
     */
    public setPerformQuery(fn: Function) {
        if (Array.isArray(fn)) {
            return this.$performQueries = this.$performQueries.concat(fn)
        }
        return this.$performQueries.push(fn)
    }
    /**
     * getPerformQueries method.
     * @returns {any}
     */
    public getPerformQueries() {
        return this.$performQueries
    }
    /**
     * morphMap method.
     * @static
     * @param {*} $map
     * @param {*} $merge
     * @returns {any}
     */
    static morphMap($map: any = null, $merge: boolean = true) {
        $map = this.buildMorphMapFromModels($map);

        if (Array.isArray($map)) {
            this.$morphMap = $merge && Array.isArray(this.$morphMap) ?
                this.$morphMap.concat($map) : $map;
        } else if (typeof $map === 'object' && $map !== null) {
            this.$morphMap = $merge && typeof this.$morphMap === 'object' && !Array.isArray(this.$morphMap) ?
                { ...(this.$morphMap as object), ...$map } : $map;
        }

        return this.$morphMap;
    }

    /**
     * buildMorphMapFromModels method.
     * @static
     * @param {*} $models
     * @returns {any}
     */
    static buildMorphMapFromModels($models: any = null) {
        if (is_null($models) || !Array.isArray($models)) {
            return $models;
        }

        return $models.concat($models.map(function ($model) {
            return (new $model).getTable();
        }));
    }

    /**
     * getMorphedModel method.
     * @static
     * @param {*} $alias
     * @returns {any}
     */
    static getMorphedModel($alias: any) {
        return this.$morphMap[$alias] || null;
    }

    /**
     * __call method.
     * @param {*} $target
     * @param {*} $method
     * @param {*} $parameters
     * @returns {any}
     */
    public __call($target: Record<string, any>, $method: string, $parameters: any[]) {

        let $fn = this.$query[$method];
        if (typeof $fn != 'function') {
            throw Error(`Property [${$method}] not available on [${this.constructor.name}] class`)
        }
        const $result = this.$query[$method](...$parameters);

        if ($result === this.$query) {
            return this;
        }

        return $result;
    }

}

export default Relation;
