const { implement } = require('@ostro/support/function');
const Relation = require('./relation')
const CollectionInterface = require('@ostro/contracts/collection/collect')
const InteractsWithPivotTable = require('./concerns/interactsWithPivotTable')
class BelongsToMany extends implement(Relation, InteractsWithPivotTable) {

    $table;

    $foreignPivotKey;

    $relatedPivotKey;

    $parentKey;

    $relatedKey;

    $relationName;

    $pivotColumns = [];

    $pivotWheres = [];

    $pivotWhereIns = [];

    $pivotWhereNulls = [];

    $pivotValues = [];

    $withTimestamps = false;

    $pivotCreatedAt;

    $pivotUpdatedAt;

    $using;

    $accessor = 'pivot';

    constructor($query, $parent, $table, $foreignPivotKey, $relatedPivotKey, $parentKey, $relatedKey, $relationName = null) {
        super($query, $parent);

        this.$parentKey = $parentKey;
        this.$relatedKey = $relatedKey;
        this.$relationName = $relationName;
        this.$relatedPivotKey = $relatedPivotKey;
        this.$foreignPivotKey = $foreignPivotKey;
        this.$table = this.resolveTableName($table);
        this.addConstraints()

    }

    resolveTableName($table) {
        if (!String.contains($table, '\\') || !String.contains($table, '/') || !class_exists($table)) {
            return $table;
        }

        $model = new $table;

        if (!$model instanceof Model) {
            return $table;
        }

        // if ($model instanceof AsPivot) {
        //     this.using($table);
        // }

        return $model.getTable();
    }

    addConstraints() {

        this.performJoin();
        if (this.constructor.$constraints) {
            this.addWhereConstraints();
        }
    }

    performJoin($query = null) {
        $query = $query || this.$query;

        $query.join(
            this.$table,
            this.getQualifiedRelatedKeyName(),
            '=',
            this.getQualifiedRelatedPivotKeyName()
        );

        return this;
    }

    addWhereConstraints() {
        this.$query.where(
            this.getQualifiedForeignPivotKeyName(), '=', this.$parent[this.$parentKey]
        );

        return this;
    }

    addEagerConstraints($models) {
        let $whereIn = this.whereInMethod(this.$parent, this.$parentKey);
        this.$query[$whereIn](
            this.getQualifiedForeignPivotKeyName(),
            this.getKeys($models, this.$parentKey)
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
            let $key = this.getDictionaryKey($model[this.$parentKey]);

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
            let $value = this.getDictionaryKey($result[this.$accessor][this.$foreignPivotKey]);

            if (!Array.isArray($dictionary[$value])) {
                $dictionary[$value] = []
            }

            $dictionary[$value].push($result);
        }

        return $dictionary;
    }

    getPivotClass() {
        return this.$using || Pivot;
    }

    using($class) {
        this.$using = $class;

        return this;
    }

    as($accessor) {
        this.$accessor = $accessor;

        return this;
    }

    wherePivot($column, $operator = null, $value = null, $boolean = 'and') {
        this.$pivotWheres.push(arguments);

        return this.where(this.qualifyPivotColumn($column), $operator, $value, $boolean);
    }

    wherePivotBetween($column, $values, $boolean = 'and', $not = false) {
        return this.whereBetween(this.qualifyPivotColumn($column), $values, $boolean, $not);
    }

    orWherePivotBetween($column, $values) {
        return this.wherePivotBetween($column, $values, 'or');
    }

    wherePivotNotBetween($column, $values, $boolean = 'and') {
        return this.wherePivotBetween($column, $values, $boolean, true);
    }

    orWherePivotNotBetween($column, $values) {
        return this.wherePivotBetween($column, $values, 'or', true);
    }

    wherePivotIn($column, $values, $boolean = 'and', $not = false) {
        this.$pivotWhereIns.push(arguments);

        return this.whereIn(this.qualifyPivotColumn($column), $values, $boolean, $not);
    }

    orWherePivot($column, $operator = null, $value = null) {
        return this.wherePivot($column, $operator, $value, 'or');
    }

    withPivotValue($column, $value = null) {
        if (is_array($column)) {
            for (let $name in $column) {
                let $value = $column[$name]
                this.withPivotValue($name, $value);
            }

            return this;
        }

        if (is_null($value)) {
            throw new InvalidArgumentException('The provided value may not be null.');
        }

        this.$pivotValues.push({ column: $column, value: $value });

        return this.wherePivot($column, '=', $value);
    }

    orWherePivotIn($column, $values) {
        return this.wherePivotIn($column, $values, 'or');
    }

    wherePivotNotIn($column, $values, $boolean = 'and') {
        return this.wherePivotIn($column, $values, $boolean, true);
    }

    orWherePivotNotIn($column, $values) {
        return this.wherePivotNotIn($column, $values, 'or');
    }

    wherePivotNull($column, $boolean = 'and', $not = false) {
        this.$pivotWhereNulls.push(arguments);

        return this.whereNull(this.qualifyPivotColumn($column), $boolean, $not);
    }

    wherePivotNotNull($column, $boolean = 'and') {
        return this.wherePivotNull($column, $boolean, true);
    }

    orWherePivotNull($column, $not = false) {
        return this.wherePivotNull($column, 'or', $not);
    }

    orWherePivotNotNull($column) {
        return this.orWherePivotNull($column, true);
    }

    orderByPivot($column, $direction = 'asc') {
        return this.orderBy(this.qualifyPivotColumn($column), $direction);
    }

    async findOrNew($id, $columns = ['*']) {
        let $instance = await this.find($id, $columns)
        if (is_null($instance)) {
            $instance = this.$related.newInstance();
        }

        return $instance;
    }

    async firstOrNew($attributes = {}) {
        let $instance = await this.where($attributes).first();
        if (is_null($instance)) {
            $instance = this.$related.newInstance($attributes);
            $instance.fill($attributes);
        }

        return $instance;
    }

    async firstOrCreate($attributes, $joining = [], $touch = true) {
        let $instance = await this.where($attributes).first()
        if (is_null($instance)) {
            $instance = await this.create($attributes, $joining, $touch);
        }

        return $instance;
    }

    async updateOrCreate($attributes, $values = [], $joining = [], $touch = true) {
        let $instance = await this.where($attributes).first()
        if (is_null($instance)) {
            return this.create($values, $joining, $touch);
        }

        $instance.fill($values);

        await $instance.save({ 'touch': false });

        return $instance;
    }

    find($id, $columns = ['*']) {
        if (!$id instanceof Model && (is_array($id) || $id instanceof Array)) {
            return this.findMany($id, $columns);
        }

        return this.where(
            this.getRelated().getQualifiedKeyName(), '=', this.parseId($id)
        ).first($columns);
    }

    findMany($ids, $columns = ['*']) {
        $ids = $ids instanceof CollectionInterface ? $ids.toArray() : $ids;

        if (empty($ids)) {
            return this.getRelated().newCollection();
        }

        return this.whereIn(
            this.getRelated().getQualifiedKeyName(), this.parseIds($ids)
        ).get($columns);
    }

    async findOrFail($id, $columns = ['*']) {
        let $result = await this.find($id, $columns);

        $id = $id instanceof CollectionInterface ? $id.toArray() : $id;

        if (is_array($id)) {
            if (count($result) === count([...new Set($id)])) {
                return $result;
            }
        } else if (!is_null($result)) {
            return $result;
        }

        throw (new ModelNotFoundException).setModel(get_class(this.$related), $id);
    }

    firstWhere($column, $operator = null, $value = null, $boolean = 'and') {
        return this.where($column, $operator, $value, $boolean).first();
    }

    async first($columns = ['*']) {
        let $results = await this.take(1).get($columns);

        return count($results) > 0 ? $results.first() : null;
    }

    async firstOrFail($columns = ['*']) {
        let $model = await this.first($columns)
        if (!is_null($model)) {
            return $model;
        }

        throw (new ModelNotFoundException).setModel(get_class(this.$related));
    }

    async getResults() {
        return !is_null(this.$parent[this.$parentKey]) ?
            await this.get() :
            this.$related.newCollection();
    }

    async get($columns = ['*']) {

        let $builder = this.$query;

        $columns = $builder.getQuery()._statements.find(res => res.grouping == 'columns') ? [] : $columns;
        let $models = $builder.select(
            this.shouldSelect($columns)
        )

        $models = await $models.getModels();

        this.hydratePivotRelation($models);

        if (count($models) > 0) {
            $models = await $builder.eagerLoadRelations($models);

        }

        return $models;
    }

    shouldSelect($columns = ['*']) {
        if ($columns.includes('*')) {
            $columns = [this.$related.getTable() + '.*'];
        }

        return $columns.concat(this.aliasedPivotColumns());
    }

    aliasedPivotColumns() {
        let $defaults = [this.$foreignPivotKey, this.$relatedPivotKey];

        return collect($defaults.concat(this.$pivotColumns)).map(($column) => {
            return this.qualifyPivotColumn($column) + ' as pivot_' + $column;
        }).unique().all();
    }

    paginate($perPage = null, $columns = ['*'], $pageName = 'page', $page = null) {

        this.$query.addSelect(this.shouldSelect($columns));

        return tap(this.$query.paginate($perPage, $columns, $pageName, $page), function ($paginator) {
            this.hydratePivotRelation($paginator.items());
        });
    }

    simplePaginate($perPage = null, $columns = ['*'], $pageName = 'page', $page = null) {
        this.$query.addSelect(this.shouldSelect($columns));

        return tap(this.$query.simplePaginate($perPage, $columns, $pageName, $page), function ($paginator) {
            this.hydratePivotRelation($paginator.items());
        });
    }

    cursorPaginate($perPage = null, $columns = ['*'], $cursorName = 'cursor', $cursor = null) {
        this.$query.addSelect(this.shouldSelect($columns));

        return tap(this.$query.cursorPaginate($perPage, $columns, $cursorName, $cursor), function ($paginator) {
            this.hydratePivotRelation($paginator.items());
        });
    }

    chunk($count, $callback) {
        return this.prepareQueryBuilder().chunk($count, function ($results, $page) {
            this.hydratePivotRelation($results.all());

            return $callback($results, $page);
        });
    }

    chunkById($count, $callback, $column = null, $alias = null) {
        this.prepareQueryBuilder();

        $column = $column || this.getRelated().qualifyColumn(
            this.getRelatedKeyName()
        );

        $alias = $alias || this.getRelatedKeyName();

        return this.$query.chunkById($count, function ($results) {
            this.hydratePivotRelation($results.all());

            return $callback($results);
        }, $column, $alias);
    }

    each($callback, $count = 1000) {
        return this.chunk($count, function ($results) {
            for (let $key in $results) {
                let $value = $results[$key]
                if ($callback($value, $key) === false) {
                    return false;
                }
            }
        });
    }

    lazy($chunkSize = 1000) {
        return this.prepareQueryBuilder().lazy($chunkSize).map(function ($model) {
            this.hydratePivotRelation([$model]);

            return $model;
        });
    }

    lazyById($chunkSize = 1000, $column = null, $alias = null) {
        $column = $column || this.getRelated().qualifyColumn(
            this.getRelatedKeyName()
        );

        $alias = $alias || this.getRelatedKeyName();

        return this.prepareQueryBuilder().lazyById($chunkSize, $column, $alias).map(function ($model) {
            this.hydratePivotRelation([$model]);

            return $model;
        });
    }

    cursor() {
        return this.prepareQueryBuilder().cursor().map(function ($model) {
            this.hydratePivotRelation([$model]);

            return $model;
        });
    }

    prepareQueryBuilder() {
        return this.$query.addSelect(this.shouldSelect());
    }

    hydratePivotRelation($models) {

        for (let $model of $models) {
            $model.setRelation(this.$accessor, this.migratePivotAttributes($model));

        }

    }

    migratePivotAttributes($model) {
        let $values = [];
        let attributes = $model.getAttributes()
        for (let $key in attributes) {
            let $value = attributes[$key]

            if ($key.startsWith('pivot_')) {
                $values[$key.substr(6)] = $value;

                unset($model.$key);
            }

        }

        return $values;
    }

    async touchIfTouching() {
        if (this.touchingParent()) {
            await this.getParent().touch();
        }

        if (this.getParent().touches(this.$relationName)) {
            await this.touch();
        }
    }

    touchingParent() {
        return this.getRelated().touches(this.guessInverseRelation());
    }

    guessInverseRelation() {
        return this.getParent().getTable();
        // return String.camel(String.pluralStudly(class_basename(this.getParent())));
    }

    async touch() {
        let $key = this.getRelated().getKeyName();

        let $columns = {
            [this.$related.getUpdatedAtColumn()]: this.$related.freshTimestampString(),
        };
        let $ids = this.allRelatedIds()
        if (count($ids) > 0) {
            await this.getRelated().newQueryWithoutRelationships().whereIn($key, $ids).update($columns);
        }
    }

    allRelatedIds() {
        return this.newPivotQuery().pluck(this.$relatedPivotKey);
    }

    async save($model, $pivotAttributes = [], $touch = true) {
        await $model.save({ 'touch': false });

        this.attach($model, $pivotAttributes, $touch);

        return $model;
    }

    async saveMany($models, $pivotAttributes = []) {
        for (let $key in $models) {
            let $model = $models[$key]
            await this.save($model, ($pivotAttributes[$key] || []), false);
        }

        await this.touchIfTouching();

        return $models;
    }

    async create($attributes = [], $joining = [], $touch = true) {
        $instance = this.$related.newInstance($attributes);
        $instance.fill($attributes);

        $instance.save({ 'touch': false });

        await this.attach($instance, $joining, $touch);

        return $instance;
    }

    async createMany($records, $joinings = []) {
        $instances = [];

        for (let $key in $records) {
            let $record = $records[$key]
            $instances.push(await this.create($record, ($joinings[$key] || []), false));
        }

        await this.touchIfTouching();

        return $instances;
    }

    getRelationExistenceQuery($query, $parentQuery, $columns = ['*']) {
        if ($parentQuery.getQuery().from == $query.getQuery().from) {
            return this.getRelationExistenceQueryForSelfJoin($query, $parentQuery, $columns);
        }

        this.performJoin($query);

        return super.getRelationExistenceQuery($query, $parentQuery, $columns);
    }

    getRelationExistenceQueryForSelfJoin($query, $parentQuery, $columns = ['*']) {

        $query.select($columns);
        $hash = this.getRelationCountHash()
        $query.from(this.$related.getTable() + ' as ' + $hash);

        this.$related.setTable($hash);
        this.performJoin($query);

        return super.getRelationExistenceQuery($query, $parentQuery, $columns);
    }

    getExistenceCompareKey() {
        return this.getQualifiedForeignPivotKeyName();
    }

    withTimestamps($createdAt = null, $updatedAt = null) {
        this.$withTimestamps = true;

        this.$pivotCreatedAt = $createdAt;
        this.$pivotUpdatedAt = $updatedAt;

        return this.withPivot(this.createdAt(), this.updatedAt());
    }

    createdAt() {
        return this.$pivotCreatedAt || this.$parent.getCreatedAtColumn();
    }

    updatedAt() {
        return this.$pivotUpdatedAt || this.$parent.getUpdatedAtColumn();
    }

    getForeignPivotKeyName() {
        return this.$foreignPivotKey;
    }

    getQualifiedForeignPivotKeyName() {
        return this.qualifyPivotColumn(this.$foreignPivotKey);
    }

    getRelatedPivotKeyName() {
        return this.$relatedPivotKey;
    }

    getQualifiedRelatedPivotKeyName() {
        return this.qualifyPivotColumn(this.$relatedPivotKey);
    }

    getParentKeyName() {
        return this.$parentKey;
    }

    getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$parentKey);
    }

    getRelatedKeyName() {
        return this.$relatedKey;
    }

    getQualifiedRelatedKeyName() {
        return this.$related.qualifyColumn(this.$relatedKey);
    }

    getTable() {
        return this.$table;
    }

    getRelationName() {
        return this.$relationName;
    }

    getPivotAccessor() {
        return this.$accessor;
    }

    getPivotColumns() {
        return this.$pivotColumns;
    }

    qualifyPivotColumn($column) {
        return String.contains($column, '.') ?
            $column :
            this.$table + '.' + $column;
    }
}

module.exports = BelongsToMany
