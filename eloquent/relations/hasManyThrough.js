const Relation = require('./relation')
const InteractsWithDictionary = require('./concerns/interactsWithDictionary')

class HasManyThrough extends implement(Relation, InteractsWithDictionary) {

    $throughParent;

    $farParent;

    $firstKey;

    $secondKey;

    $localKey;

    $secondLocalKey;

    constructor($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey) {
        super($query, $throughParent);

        this.$localKey = $localKey;
        this.$firstKey = $firstKey;
        this.$secondKey = $secondKey;
        this.$farParent = $farParent;
        this.$throughParent = $throughParent;
        this.$secondLocalKey = $secondLocalKey;
        this.addConstraints()

    }

    addConstraints() {
        let $localValue = this.$farParent[this.$localKey];

        this.performJoin();

        if (this.constructor.$constraints) {
            this.$query.where(this.getQualifiedFirstKeyName(), '=', $localValue);
        }

    }

    performJoin($query = null) {
        $query = $query || this.$query;

        let $farKey = this.getQualifiedFarKeyName();

        $query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', $farKey);

    }

    getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$secondLocalKey);
    }

    throughParentSoftDeletes() {
        return in_array(SoftDeletes, class_uses_recursive(this.$throughParent));
    }

    withTrashedParents() {
        this.$query.withoutGlobalScope('SoftDeletableHasManyThrough');

        return this;
    }

    addEagerConstraints($models) {
        let $whereIn = this.whereInMethod(this.$farParent, this.$localKey);

        this.$query[$whereIn](
            this.getQualifiedFirstKeyName(), this.getKeys($models, this.$localKey)
        );

    }

    initRelation($models, $relation) {
        for (let $model of $models) {
            $model.setRelation($relation, this.$related.newCollection());
        }

        return $models;
    }

    match($models, $results, $relation) {
        let $dictionary = this.buildDictionary($results);

        for (let $model of $models) {
            let $key = this.getDictionaryKey($model.getAttribute(this.$localKey))
            if (isset($dictionary[$key])) {
                $model.setRelation(
                    $relation, this.$related.newCollection($dictionary[$key])
                );
            }
        }
        return $models;
    }

    buildDictionary($results) {
        let $dictionary = {};
        for (let $result of $results) {
            if (!Array.isArray($dictionary[$result.ostro_through_key])) {
                $dictionary[$result.ostro_through_key] = []
            }

            $dictionary[$result.ostro_through_key].push($result);
        }

        return $dictionary;
    }

    async firstOrNew($attributes) {
        let $instance = await this.$parent.where($attributes).first()
        if (is_null($instance)) {
            $instance = this.$related.newInstance();
            $instance.fill($attributes);
        }

        return $instance;
    }

    async updateOrCreate($attributes, $values = []) {
        let $instance = await this.firstOrNew($attributes);

        $instance.fill($values).save();

        return $instance;
    }

    firstWhere($column, $operator = null, $value = null, $boolean = 'and') {
        return this.where($column, $operator, $value, $boolean).first();
    }

    async first($columns = ['*']) {
        let $results = await this.take(1).get($columns);

        return $results.length ? $results.first() : null;
    }

    async firstOrFail($columns = ['*']) {
        let $model = await this.first($columns)
        if (!is_null($model)) {
            return $model;
        }

        throw (new ModelNotFoundException).setModel(get_class(this.$related));
    }

    find($id, $columns = ['*']) {
        if (Array.isArray($id) || $id instanceof Array) {
            return this.findMany($id, $columns);
        }

        return this.where(
            this.getRelated().getQualifiedKeyName(), '=', $id
        ).first($columns);
    }

    findMany($ids, $columns = ['*']) {
        $ids = $ids instanceof Arrayable ? $ids.toArray() : $ids;

        if (empty($ids)) {
            return this.getRelated().newCollection();
        }

        return this.whereIn(
            this.getRelated().getQualifiedKeyName(), $ids
        ).get($columns);
    }

    findOrFail($id, $columns = ['*']) {
        $result = this.find($id, $columns);

        $id = $id instanceof Arrayable ? $id.toArray() : $id;

        if (is_array($id)) {
            if (count($result) === count([...new Set($id)])) {
                return $result;
            }
        } else if (!is_null($result)) {
            return $result;
        }

        throw (new ModelNotFoundException).setModel(get_class(this.$related), $id);
    }

    getResults() {
        return !is_null(this.$farParent[this.$localKey]) ?
            this.get() :
            this.$related.newCollection();
    }

    async get($columns = ['*']) {
        let $builder = this.prepareQueryBuilder($columns);

        let $models = await $builder.getModels();

        if (count($models) > 0) {
            $models = $builder.eagerLoadRelations($models);
        }
        return $models;
    }

    paginate($perPage = null, $columns = ['*'], $pageName = 'page', $page = null) {
        this.$query.select(this.shouldSelect($columns));

        return this.$query.paginate($perPage, $columns, $pageName, $page);
    }

    simplePaginate($perPage = null, $columns = ['*'], $pageName = 'page', $page = null) {
        this.$query.select(this.shouldSelect($columns));

        return this.$query.simplePaginate($perPage, $columns, $pageName, $page);
    }

    shouldSelect($columns = ['*']) {
        if ($columns == ['*']) {
            $columns = [this.$related.getTable() + '.*'];
        }

        return $columns.concat([this.getQualifiedFirstKeyName() + ' as ostro_through_key']);
    }

    chunk($count, $callback) {
        return this.prepareQueryBuilder().chunk($count, $callback);
    }

    chunkById($count, $callback, $column = null, $alias = null) {
        $column = $column || this.getRelated().getQualifiedKeyName();

        $alias = $alias || this.getRelated().getKeyName();

        return this.prepareQueryBuilder().chunkById($count, $callback, $column, $alias);
    }

    cursor() {
        return this.prepareQueryBuilder().cursor();
    }

    each($callback, $count = 1000) {
        return this.chunk($count, function ($results) {
            for (let [$key, $value] in $results) {
                if ($callback($value, $key) === false) {
                    return false;
                }
            }
        });
    }

    lazy($chunkSize = 1000) {
        return this.prepareQueryBuilder().lazy($chunkSize);
    }

    lazyById($chunkSize = 1000, $column = null, $alias = null) {
        $column = $column || this.getRelated().getQualifiedKeyName();

        $alias = $alias || this.getRelated().getKeyName();

        return this.prepareQueryBuilder().lazyById($chunkSize, $column, $alias);
    }

    prepareQueryBuilder($columns = ['*']) {
        let $builder = this.$query;
        $columns = $builder.getQuery()._statements.find(res => res.grouping == 'columns') ? [] : $columns;

        return $builder.select(
            this.shouldSelect($columns)
        );
    }

    getRelationExistenceQuery($query, $parentQuery, $columns = ['*']) {
        if ($parentQuery.getQuery().from === $query.getQuery().from) {
            return this.getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns);
        }

        if ($parentQuery.getQuery().from === this.$throughParent.getTable()) {
            return this.getRelationExistenceQueryForThroughSelfRelation($query, $parentQuery, $columns);
        }

        this.performJoin($query);

        return $query.select($columns).whereColumn(
            this.getQualifiedLocalKeyName(), '=', this.getQualifiedFirstKeyName()
        );
    }

    getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns = ['*']) {
        let $hash = this.getRelationCountHash()
        $query.from($query.getModel().getTable() + ' as ' + $hash);

        $query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', $hash + '.' + this.$secondKey);

        $query.getModel().setTable($hash);

        return $query.select($columns).whereColumn(
            $parentQuery.getQuery().from + '.' + this.$localKey, '=', this.getQualifiedFirstKeyName()
        );
    }

    getRelationExistenceQueryForThroughSelfRelation($query, $parentQuery, $columns = ['*']) {
        let $hash = this.getRelationCountHash()
        $table = this.$throughParent.getTable() + ' as ' + $hash;

        $query.join($table, $hash + '.' + this.$secondLocalKey, '=', this.getQualifiedFarKeyName());

        return $query.select($columns).whereColumn(
            $parentQuery.getQuery().from + '.' + this.$localKey, '=', $hash + '.' + this.$firstKey
        );
    }

    getQualifiedFarKeyName() {
        return this.getQualifiedForeignKeyName();
    }

    getFirstKeyName() {
        return this.$firstKey;
    }

    getQualifiedFirstKeyName() {
        return this.$throughParent.qualifyColumn(this.$firstKey);
    }

    getForeignKeyName() {
        return this.$secondKey;
    }

    getQualifiedForeignKeyName() {
        return this.$related.qualifyColumn(this.$secondKey);
    }

    getLocalKeyName() {
        return this.$localKey;
    }

    getQualifiedLocalKeyName() {
        return this.$farParent.qualifyColumn(this.$localKey);
    }

    getSecondLocalKeyName() {
        return this.$secondLocalKey;
    }
}

module.exports = HasManyThrough
