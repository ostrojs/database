const { Macroable, Micros } = require('@ostro/support/macro')
const InteractsWithDictionary = require('./concerns/interactsWithDictionary')

class Relation extends Macroable.implement(InteractsWithDictionary) {

    $query = null;

    $parent = null;

    $related = null;

    static $selfJoinCount = 0;

    static $constraints = true;

    static $morphMap = [];

    $performQueries = [];

    constructor($query, $parent) {
        super()
        this.$query = $query;
        this.$parent = $parent;
        this.$related = $query.getModel();
    }

    static noConstraints($callback) {
        let $previous = this.$constraints;

        this.$constraints = false;

        try {
            return $callback();
        } finally {
            this.$constraints = $previous;
        }
    }

    addConstraints() {

    }

    addEagerConstraints($models) {

    }

    initRelation($models, $relation) {

    }

    match($models, $results, $relation) {

    }

    getResults() {

    }

    getEager() {
        return this.get();
    }

    sole($columns = ['*']) {
        $result = this.take(2).get($columns);

        if ($result.isEmpty()) {
            throw (new ModelNotFoundException).setModel(get_class(this.$related));
        }

        if ($result.count() > 1) {
            throw new MultipleRecordsFoundException;
        }

        return $result.first();
    }

    get() {

        return this.$query.get();
    }

    touch() {
        $model = this.getRelated();

        if (!$model.isIgnoringTouch()) {
            this.rawUpdate({
                [$model.getUpdatedAtColumn()]: $model.freshTimestampString(),
            });
        }
    }

    rawUpdate($attributes = []) {
        return this.$query.withoutGlobalScopes().update($attributes);
    }

    getRelationExistenceCountQuery($query, $parentQuery) {
        return this.getRelationExistenceQuery(
            $query, $parentQuery, 'count(*)'
        );
    }

    getRelationExistenceQuery($query, $parentQuery, $columns = ['*']) {
        return $query.select($columns).whereRaw(
            this.getQualifiedParentKeyName() + '=' + this.getExistenceCompareKey()
        );
    }

    getRelationCountHash($incrementJoinCount = true) {

        return 'ostro_reserved_' + ($incrementJoinCount ? this.constructor.$selfJoinCount++ : this.constructor.$selfJoinCount);
    }

    getKeys($models, $key = null) {
        return $models.map(function ($value) {
            return $key ? $value.getAttribute($key) : $value.getKey();
        }).values().unique(null, true).sortBy().all();
    }

    getRelationQuery() {
        return this.$query;
    }

    getQuery() {
        return this.$query;
    }

    getBaseQuery() {
        return this.$query.getQuery();
    }

    getParent() {
        return this.$parent;
    }

    getQualifiedParentKeyName() {
        return this.$parent.getQualifiedKeyName();
    }

    getRelated() {
        return this.$related;
    }

    createdAt() {
        return this.$parent.getCreatedAtColumn();
    }

    updatedAt() {
        return this.$parent.getUpdatedAtColumn();
    }

    relatedUpdatedAt() {
        return this.$related.getUpdatedAtColumn();
    }

    whereInMethod($model, $key) {
        if ($model.getKeyName() === $key.split('.').pop() &&
            ['int', 'integer'].includes($model.getKeyType())) {
            return 'whereIntegerInRaw';
        } else {
            return 'whereIn';
        }
    }
    setPerformQuery(fn) {
        if (Array.isArray(fn)) {
            return this.$performQueries = this.$performQueries.concat(fn)
        }
        return this.$performQueries.push(fn)
    }
    getPerformQueries(){
        return this.$performQueries
    }
    static morphMap($map = null, $merge = true) {
        $map = this.buildMorphMapFromModels($map);

        if (is_array($map)) {
            this.$morphMap = $merge && this.$morphMap ?
                $map + this.$morphMap : $map;
        }

        return this.$morphMap;
    }

    static buildMorphMapFromModels($models = null) {
        if (is_null($models) || Array.isAssoc($models)) {
            return $models;
        }

        return $models.concat($models.map(function ($model) {
            return (new $model).getTable();
        }));
    }

    static getMorphedModel($alias) {
        return this.$morphMap[$alias] || null;
    }

    __call($target, $method, $parameters) {

        let $fn = this.$query[$method];
        if(typeof $fn != 'function'){
            throw Error(`Property [${$method}] not available on [${this.constructor.name}] class`)
        }
        const $result = this.$query[$method](...$parameters);

        if ($result === this.$query) {
            return this;
        }

        return $result;
    }

}

module.exports = Relation
