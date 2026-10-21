import HasOne from '../relations/hasOne';
import HasMany from '../relations/hasMany';
import BelongsTo from '../relations/belongsTo';
import HasOneThrough from '../relations/hasOneThrough';
import HasManyThrough from '../relations/hasManyThrough';
import BelongsToMany from '../relations/belongsToMany';
import { getCallerFunctionName, exists, get_class, is_null, get_class_name, in_array, clone, tap } from '@ostro/support/function';
import { snake } from '@ostro/support/string';
import Collect from '@ostro/support/collection';
const kRelation = Symbol('relation')
const kTouches = Symbol('touches')

/**
 * Class HasRelationships.
 */
class HasRelationships {
    [key: string]: any;
    [kRelation] = {};

    [kTouches] = [];

    static get $manyMethods() {
        return [
            'belongsToMany',
        ];
    }

    static $relationResolvers = {};

    /**
     * resolveRelationUsing method.
     * @static
     * @param {*} $name
     * @param {*} $callback
     * @returns {any}
     */
    static resolveRelationUsing($name: string, $callback: Function) {

    }

    /**
     * hasOne method.
     * @param {*} $related
     * @param {*} $foreignKey
     * @param {*} $localKey
     * @returns {any}
     */
    public hasOne($related: any, $foreignKey: any = null, $localKey: any = null) {
        $related = typeof $related == 'string' ? require($related) : $related

        let $instance = this.newRelatedInstance($related);

        $foreignKey = $foreignKey || this.getForeignKey();

        $localKey = $localKey || this.getKeyName();

        return this.newHasOne($instance.newQuery(), this, $instance.getTable() + '.' + $foreignKey, $localKey);
    }

    /**
     * newHasOne method.
     * @param {*} $query
     * @param {*} $parent
     * @param {*} $foreignKey
     * @param {*} $localKey
     * @returns {any}
     */
    public newHasOne($query: any, $parent: any, $foreignKey: any, $localKey: any) {
        return new (HasOne as any)($query, $parent, $foreignKey, $localKey);
    }

    /**
     * hasOneThrough method.
     * @param {*} $related
     * @param {*} $through
     * @param {*} $firstKey
     * @param {*} $secondKey
     * @param {*} $localKey
     * @param {*} $secondLocalKey
     * @returns {any}
     */
    public hasOneThrough($related: any, $through: any, $firstKey: any = null, $secondKey: any = null, $localKey: any = null, $secondLocalKey: any = null) {
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

    /**
     * newHasOneThrough method.
     * @param {*} $query
     * @param {*} $farParent
     * @param {*} $throughParent
     * @param {*} $firstKey
     * @param {*} $secondKey
     * @param {*} $localKey
     * @param {*} $secondLocalKey
     * @returns {any}
     */
    public newHasOneThrough($query: any, $farParent: any, $throughParent: any, $firstKey: any, $secondKey: any, $localKey: any, $secondLocalKey: any) {
        return new (HasOneThrough as any)($query, $farParent, $throughParent, $firstKey, $secondKey, $localKey, $secondLocalKey);
    }

    /**
     * belongsTo method.
     * @param {*} $related
     * @param {*} $foreignKey
     * @param {*} $ownerKey
     * @param {*} $relation
     * @returns {any}
     */
    public belongsTo($related: any, $foreignKey: any = null, $ownerKey: any = null, $relation: any = null) {
        $related = typeof $related == 'string' ? require($related) : $related

        if (is_null($relation)) {
            $relation = this.guessBelongsToRelation();
        }

        let $instance = this.newRelatedInstance($related);


        if (is_null($foreignKey)) {
            $foreignKey = snake($relation) + '_' + $instance.getKeyName();
        }

        $ownerKey = $ownerKey || $instance.getKeyName();

        const belongsToRelation = this.newBelongsTo(
            $instance.newQuery(), this, $foreignKey, $ownerKey, $relation
        )
        belongsToRelation.addConstraints();
        if (this.$exists && !getCallerFunctionName('eagerLoadRelation')) {
            belongsToRelation.addEagerConstraints(new Collect([this]));
        }
        return belongsToRelation

    }

    /**
     * newBelongsTo method.
     * @param {*} $query
     * @param {*} $child
     * @param {*} $foreignKey
     * @param {*} $ownerKey
     * @param {*} $relation
     * @returns {any}
     */
    public newBelongsTo($query: any, $child: any, $foreignKey: any, $ownerKey: any, $relation: any) {
        return new BelongsTo($query, $child, $foreignKey, $ownerKey, $relation);
    }

    /**
     * guessBelongsToRelation method.
     * @returns {any}
     */
    public guessBelongsToRelation() {
        return getCallerFunctionName('belongsTo');

    }
    /**
     * hasMany method.
     * @param {*} $related
     * @param {*} $foreignKey
     * @param {*} $localKey
     * @returns {any}
     */
    public hasMany($related: any, $foreignKey: any = null, $localKey: any = null) {
        $related = typeof $related == 'string' ? require($related) : $related
        let $instance = this.newRelatedInstance($related);

        $foreignKey = $foreignKey || this.getForeignKey();

        $localKey = $localKey || this.getKeyName();
        return this.newHasMany(
            $instance.newQuery(), this, $instance.getTable() + '.' + $foreignKey, $localKey
        );
    }

    /**
     * newHasMany method.
     * @param {*} $query
     * @param {*} $parent
     * @param {*} $foreignKey
     * @param {*} $localKey
     * @returns {any}
     */
    public newHasMany($query: any, $parent: any, $foreignKey: any, $localKey: any) {
        return new HasMany($query, $parent, $foreignKey, $localKey);
    }

    /**
     * hasManyThrough method.
     * @param {*} $related
     * @param {*} $through
     * @param {*} $firstKey
     * @param {*} $secondKey
     * @param {*} $localKey
     * @param {*} $secondLocalKey
     * @returns {any}
     */
    public hasManyThrough($related: any, $through: any, $firstKey: any = null, $secondKey: any = null, $localKey: any = null, $secondLocalKey: any = null) {
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

    /**
     * newHasManyThrough method.
     * @param {*} $query
     * @param {*} $farParent
     * @param {*} $throughParent
     * @param {*} $firstKey
     * @param {*} $secondKey
     * @param {*} $localKey
     * @param {*} $secondLocalKey
     * @returns {any}
     */
    public newHasManyThrough($query: any, $farParent: any, $throughParent: any, $firstKey: any, $secondKey: any, $localKey: any, $secondLocalKey: any) {
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

    /**
     * guessBelongsToManyRelation method.
     * @returns {any}
     */
    public guessBelongsToManyRelation() {
        return getCallerFunctionName('belongsToMany')

    }

    /**
     * joiningTable method.
     * @param {*} $related
     * @param {*} $instance
     * @returns {any}
     */
    public joiningTable($related: any, $instance: any = null) {

        let $segments = [
            $instance ? $instance.joiningTableSegment() :
                snake(get_class_name($related)),
            this.joiningTableSegment(),
        ];

        $segments = $segments.sort();

        return $segments.join('_').toLowerCase();
    }

    /**
     * joiningTableSegment method.
     * @returns {any}
     */
    public joiningTableSegment() {
        return snake(get_class_name(this));
    }

    /**
     * touches method.
     * @param {*} $relation
     * @returns {any}
     */
    public touches($relation: any) {
        return in_array($relation, this.getTouchedRelations());
    }

    /**
     * touchOwners method.
     * @returns {any}
     */
    public touchOwners() {
        for (let $relation of this.getTouchedRelations()) {
            this[$relation]().touch();

            let relatedModel = this.getRelations()[$relation];
            if (relatedModel && typeof relatedModel.touchOwners === 'function') {
                relatedModel.touchOwners();
            }
        }
    }

    /**
     * newRelatedInstance method.
     * @param {*} $class
     * @returns {any}
     */
    public newRelatedInstance($class: any) {
        return tap(new $class, ($instance) => {
            if (!$instance.getConnectionName()) {
                $instance.setConnection(this.$connection);
            }
        });
    }

    /**
     * getRelations method.
     * @returns {any}
     */
    public getRelations() {
        return this[kRelation]
    }

    /**
     * existsRelation method.
     * @param {*} $key
     * @returns {any}
     */
    public existsRelation($key: string) {
        return Boolean(this.relationLoaded($key))
    }

    /**
     * relationLoaded method.
     * @param {*} $key
     * @returns {any}
     */
    public relationLoaded($key: string) {
        return Boolean(this.getRelations()?.[$key]);
    }
    /**
     * relation method.
     * @param {*} relation
     * @returns {any}
     */
    public relation(relation: any) {
        return this.getRelations()[relation]
    }

    /**
     * setRelation method.
     * @param {*} $relation
     * @param {*} $value
     * @returns {any}
     */
    public setRelation($relation: any, $value: any = null) {

        Object.defineProperty(this, '$$' + $relation, { value: $value, writable: true })
        this.getRelations()[$relation] = $value;

        return this;
    }

    /**
     * unsetRelation method.
     * @param {*} $relation
     * @returns {any}
     */
    public unsetRelation($relation: any) {
        delete this[kRelation][$relation];

        return this;
    }

    /**
     * setRelations method.
     * @param {*} $relations
     * @returns {any}
     */
    public setRelations($relations: any) {
        this[kRelation] = $relations;

        return this;
    }

    /**
     * withoutRelations method.
     * @returns {any}
     */
    public withoutRelations() {
        let $model = clone(this);

        return $model.unsetRelations();
    }

    /**
     * unsetRelations method.
     * @returns {any}
     */
    public unsetRelations() {
        this[kRelation] = {};

        return this;
    }

    /**
     * load method.
     * @async
     * @param {*} $relations
     * @returns {any}
     */
    public async load($relations: any) {
        let relations = Array.isArray($relations) ? $relations : (arguments.length === 1 && typeof $relations === 'string' ? [$relations] : [...arguments]);
        for (let rel of relations) {
            if (typeof this[rel] === 'function') {
                let relationObj = this[rel]();
                let results = await relationObj.getResults();
                this.setRelation(rel, results);
            }
        }
        return this;
    }

    /**
     * getTouchedRelations method.
     * @returns {any}
     */
    public getTouchedRelations() {
        return this[kTouches];
    }

    /**
     * setTouchedRelations method.
     * @param {*} $touches
     * @returns {any}
     */
    public setTouchedRelations($touches: any) {
        this[kTouches] = $touches;

        return this;
    }
}

export default HasRelationships;
