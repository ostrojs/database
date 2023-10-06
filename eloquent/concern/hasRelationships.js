const HasOne = require('../relations/hasOne')
const HasMany = require('../relations/hasMany')
const BelongsTo = require('../relations/belongsTo')
const HasOneThrough = require('../relations/hasOneThrough')
const HasManyThrough = require('../relations/hasManyThrough')
const BelongsToMany = require('../relations/belongsToMany')
const { getCallerFunctionName, exists } = require('@ostro/support/function')

const Collect = require('@ostro/support/collection')
const kRelation = Symbol('relation')
const kTouches = Symbol('touches')

class HasRelationships {

    [kRelation] = {};

    [kTouches] = [];

    static get $manyMethods() {
        return [
            'belongsToMany',
        ];
    }

    static $relationResolvers = {};

    static resolveRelationUsing($name, $callback) {

    }

    hasOne($related, $foreignKey = null, $localKey = null) {
        $related = typeof $related == 'string' ? require($related) : $related

        let $instance = this.newRelatedInstance($related);

        $foreignKey = $foreignKey || this.getForeignKey();

        $localKey = $localKey || this.getKeyName();

        return this.newHasOne($instance.newQuery(), this, $instance.getTable() + '.' + $foreignKey, $localKey);
    }

    newHasOne($query, $parent, $foreignKey, $localKey) {
        return new HasOne($query, $parent, $foreignKey, $localKey);
    }

    hasOneThrough($related, $through, $firstKey = null, $secondKey = null, $localKey = null, $secondLocalKey = null) {
        $through = typeof $through == 'string' ? require($through) : $through
        $related = typeof $related == 'string' ? require($related) : $related

        $through = new $through;

        $firstKey = $firstKey || this.getForeignKey();

        $secondKey = $secondKey || $through.getForeignKey();

        return this.newHasOneThrough(
            this.newRelatedInstance($related).newQuery(), this, $through,
            $firstKey, $secondKey, $localKey || this.getKeyName(),
            $secondLocalKey || $through.getKeyName()
        );
    }

    newHasOneThrough($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey) {
        return new HasOneThrough($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey);
    }

    belongsTo($related, $foreignKey = null, $ownerKey = null, $relation = null) {
        $related = typeof $related == 'string' ? require($related) : $related

        if (is_null($relation)) {
            $relation = this.guessBelongsToRelation();
        }

        let $instance = this.newRelatedInstance($related);


        if (is_null($foreignKey)) {
            $foreignKey = String.snakeCase($relation) + '_' + $instance.getKeyName();
        }

        $ownerKey = $ownerKey || $instance.getKeyName();

        const belongsToRelation = this.newBelongsTo(
            $instance.newQuery(), this, $foreignKey, $ownerKey, $relation
        )
        if (this.$exists && !getCallerFunctionName('eagerLoadRelation')) {
            belongsToRelation.addEagerConstraints(new Collect([this]));
        }
        return belongsToRelation

    }

    newBelongsTo($query, $child, $foreignKey, $ownerKey, $relation) {
        return new BelongsTo($query, $child, $foreignKey, $ownerKey, $relation);
    }

    guessBelongsToRelation() {
        return getCallerFunctionName('belongsTo');

    }
    hasMany($related, $foreignKey = null, $localKey = null) {
        $related = typeof $related == 'string' ? require($related) : $related
        let $instance = this.newRelatedInstance($related);

        $foreignKey = $foreignKey || this.getForeignKey();

        $localKey = $localKey || this.getKeyName();
        return this.newHasMany(
            $instance.newQuery(), this, $instance.getTable() + '.' + $foreignKey, $localKey
        );
    }

    newHasMany($query, $parent, $foreignKey, $localKey) {
        return new HasMany($query, $parent, $foreignKey, $localKey);
    }

    hasManyThrough($related, $through, $firstKey = null, $secondKey = null, $localKey = null, $secondLocalKey = null) {
        $through = typeof $through == 'string' ? require($through) : $through
        $related = typeof $related == 'string' ? require($related) : $related

        $through = new $through;

        $firstKey = $firstKey || this.getForeignKey();

        $secondKey = $secondKey || $through.getForeignKey();

        const hasManyThroughRelation = this.newHasManyThrough(
            this.newRelatedInstance($related).newQuery(),
            this,
            $through,
            $firstKey,
            $secondKey,
            $localKey || this.getKeyName(),
            $secondLocalKey || $through.getKeyName()
        );
        if (this.$exists && !getCallerFunctionName('eagerLoadRelation')) {
            hasManyThroughRelation.addEagerConstraints(new Collect([this]));
        }
        return hasManyThroughRelation
    }

    newHasManyThrough($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey) {
        return new HasManyThrough($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey);
    }

    belongsToMany($related, $table = null, $foreignPivotKey = null, $relatedPivotKey = null,
        $parentKey = null, $relatedKey = null, $relation = null) {
        $related = typeof $related == 'string' ? require($related) : $related

        if (is_null($relation)) {
            $relation = this.guessBelongsToManyRelation();
        }

        let $instance = this.newRelatedInstance($related);
        $foreignPivotKey = $foreignPivotKey || this.getForeignKey();

        $relatedPivotKey = $relatedPivotKey || $instance.getForeignKey();

        if (is_null($table)) {
            $table = this.joiningTable($related, $instance);
        }

        return this.newBelongsToMany(
            $instance.newQuery(), this, $table, $foreignPivotKey,
            $relatedPivotKey, $parentKey || this.getKeyName(),
            $relatedKey || $instance.getKeyName(), $relation
        );
    }

    newBelongsToMany($query, $parent, $table, $foreignPivotKey, $relatedPivotKey,
        $parentKey, $relatedKey, $relationName = null) {
        return new BelongsToMany($query, $parent, $table, $foreignPivotKey, $relatedPivotKey, $parentKey, $relatedKey, $relationName);
    }

    guessBelongsToManyRelation() {
        return getCallerFunctionName('belongsToMany')

    }

    joiningTable($related, $instance = null) {

        let $segments = [
            $instance ? $instance.joiningTableSegment() :
                String.snakeCase(class_basename($related)),
            this.joiningTableSegment(),
        ];

        $segments = $segments.sort();

        return $segments.join('_').toLowerCase();
    }

    joiningTableSegment() {
        return String.snakeCase(class_basename(this));
    }

    touches($relation) {
        return in_array($relation, this.getTouchedRelations());
    }

    touchOwners() {
        for (let $relation of this.getTouchedRelations()) {
            this[$relation]().touch();

            if (this.$relation instanceof this.constructor) {
                this.$relation.fireModelEvent('saved', false);

                this.$relation.touchOwners();
            }
        }
    }

    newRelatedInstance($class) {
        return tap(new $class, ($instance) => {
            if (!$instance.getConnectionName()) {
                $instance.setConnection(this.$connection);
            }
        });
    }

    getRelations() {
        return this[kRelation]
    }

    existsRelation($key) {
        return Boolean(this.relationLoaded($key))
    }

    relationLoaded($key) {
        return exists(this.getRelations()[$key]);
    }
    relation(relation) {
        return this.getRelations()[relation]
    }

    setRelation($relation, $value = null) {

        Object.defineProperty(this, '$$' + $relation, { value: $value, writable: true })
        this.getRelations()[$relation] = $value;

        return this;
    }

    unsetRelation($relation) {
        delete this[kRelation][$relation];

        return this;
    }

    setRelations($relations) {
        this[kRelation] = $relations;

        return this;
    }

    withoutRelations() {
        let $model = clone(this);

        return $model.unsetRelations();
    }

    unsetRelations() {
        this[kRelation] = {};

        return this;
    }

    getTouchedRelations() {
        return this[kTouches];
    }

    setTouchedRelations($touches) {
        this[kTouches] = $touches;

        return this;
    }
}

module.exports = HasRelationships
