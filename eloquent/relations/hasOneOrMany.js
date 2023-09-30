const Relation = require('./relation')
const kForeignKey = Symbol('foreignKey')
const kLocalKey = Symbol('localKey')
class HasOneOrMany extends Relation {

    $foreignKey = '';

    $localKey = '';

    constructor($query, $parent, $foreignKey, $localKey) {
        super($query, $parent);
        this.$localKey = $localKey;
        this.$foreignKey = $foreignKey;
        this.addConstraints();

    }

    make($attributes = {}) {
        return tap(this.$related.newInstance($attributes), function ($instance) {
            this.setForeignAttributesForCreate($instance);
        });
    }

    makeMany($records) {
        $instances = this.$related.newCollection();

        for (let $record of $records) {
            $instances.push(this.make($record));
        }

        return $instances;
    }

    addConstraints() {

        if (this.constructor.$constraints) {
            let $query = this.getRelationQuery();

            $query.where(this.getQualifiedForeignKeyName(), '=', this.getParentKey());

            $query.whereNotNull(this.getQualifiedForeignKeyName());
        }
    }

    addEagerConstraints($models) {
        let $whereIn = this.whereInMethod(this.$parent, this.$localKey);
        return this.getRelationQuery()[$whereIn](
            this.$foreignKey, this.getKeys($models, this.$localKey).filter(res => res)
        );
    }

    matchOne($models, $results, $relation) {
        return this.matchOneOrMany($models, $results, $relation, 'one');
    }

    matchMany($models, $results, $relation) {
        return this.matchOneOrMany($models, $results, $relation, 'many');
    }

    matchOneOrMany($models, $results, $relation, $type) {
        let $dictionary = this.buildDictionary($results);

        for (let $model of $models) {
            let $key = this.getDictionaryKey($model.getAttribute(this.$localKey))
            if (isset($dictionary[$key])) {
                $model.setRelation(
                    $relation, this.getRelationValue($dictionary, $key, $type)
                );
            }

        }

        return $models;
    }

    getRelationValue($dictionary, $key, $type) {
        let $value = $dictionary[$key]
        return $type === 'one' ? $value[0] || null : this.$related.newCollection($value);
    }

    buildDictionary($results) {
        let $foreign = this.getForeignKeyName();
        let $res = {}
        $results.forEach(($result) => {
            let $key = this.getDictionaryKey($result[$foreign])
            if (!Array.isArray($res[$key])) {
                $res[$key] = []
            }
            $res[$key].push($result)
        });

        return $res
    }

    async findOrNew($id, $columns = ['*']) {
        let $instance = await this.find($id, $columns)
        if (is_null($instance)) {
            $instance = this.$related.newInstance();

            this.setForeignAttributesForCreate($instance);
        }

        return $instance;
    }

    async firstOrNew($attributes = {}, $values = {}) {
        let $instance = await this.where($attributes).first()
        if (is_null($instance)) {
            $instance = this.$related.newInstance({ ...$attributes, ...$values });

            this.setForeignAttributesForCreate($instance);
        }

        return $instance;
    }

    firstOrCreate($attributes = {}, $values = {}) {
        if (is_null($instance = this.where($attributes).first())) {
            $instance = this.create({ ...$attributes, ...$values });
        }

        return $instance;
    }

    updateOrCreate($attributes, $values = {}) {
        return tap(this.firstOrNew($attributes), function ($instance) {
            $instance.fill($values);

            $instance.save();
        });
    }

    save($model) {
        this.setForeignAttributesForCreate($model);

        return $model.save() ? $model : false;
    }

    saveMany($models) {
        for (let $model in $models) {
            this.save($model);
        }

        return $models;
    }

    create($attributes = {}) {
        return tap(this.$related.newInstance($attributes), function ($instance) {
            this.setForeignAttributesForCreate($instance);

            $instance.save();
        });
    }

    createMany($records) {
        let $instances = this.$related.newCollection();

        for (let $record in $records) {
            $instances.push(this.create($record));
        }
        return $instances;
    }

    setForeignAttributesForCreate($model) {
        $model.setAttribute(this.getForeignKeyName(), this.getParentKey());
    }

    getRelationExistenceQuery($query, $parentQuery, $columns = ['*']) {
        if ($query.getQuery()._single.table == $parentQuery.getQuery()._single.table) {
            return this.getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns);
        }

        return super.getRelationExistenceQuery($query, $parentQuery, $columns);
    }

    getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns = ['*']) {
        let $hash = this.getRelationCountHash()
        $query.from($query.getModel().getTable() + ' as ' + $hash);

        $query.getModel().setTable($hash);

        return $query.select($columns).whereRaw(
            this.getQualifiedParentKeyName() + '=' + $hash + '.' + this.getForeignKeyName()
        );
    }

    getExistenceCompareKey() {
        return this.getQualifiedForeignKeyName();
    }

    getParentKey() {
        return this.$parent.getAttribute(this.$localKey);
    }

    getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$localKey);
    }

    getForeignKeyName() {
        let $segments = this.getQualifiedForeignKeyName().split('.');

        return $segments.last();
    }

    getQualifiedForeignKeyName() {
        return this.$foreignKey;
    }

    getLocalKeyName() {
        return this.$localKey;
    }
}

module.exports = HasOneOrMany
