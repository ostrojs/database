import { implement, isset, is_null } from '@ostro/support/function';
import Model from '@ostro/contracts/database/eloquent/model';
import Relation from './relation';
import SupportsDefaultModels from './concerns/supportsDefaultModels';

/**
 * Class BelongsTo.
 */
class BelongsTo extends implement(Relation, SupportsDefaultModels) {

    $child;

    $foreignKey;

    $ownerKey;

    $relationName;

    /**
     * Create a new instance.
     * @param {*} $query
     * @param {*} $child
     * @param {*} $foreignKey
     * @param {*} $ownerKey
     * @param {*} $relationName
     */
    constructor($query: any, $child: any, $foreignKey: any, $ownerKey: any, $relationName: any) {
        super($query, $child);

        this.$ownerKey = $ownerKey;
        this.$relationName = $relationName;
        this.$foreignKey = $foreignKey;

        this.$child = $child;

    }

    /**
     * getResults method.
     * @async
     * @returns {any}
     */
    public async getResults() {
        if (is_null(this.$child[this.$foreignKey])) {
            return this.getDefaultFor(this.$parent);
        }

        return (await this.$query.first()) || this.getDefaultFor(this.$parent);
    }

    /**
     * addConstraints method.
     * @returns {any}
     */
    public addConstraints() {
        if ((this.constructor as any).$constraints) {

            let $table = this.$related.getTable();

            this.$query.where($table + '.' + this.$ownerKey, '=', this.$child[this.$foreignKey]);
        }
    }

    /**
     * addEagerConstraints method.
     * @param {*} $models
     * @returns {any}
     */
    public addEagerConstraints($models: any) {

        let $key = this.$related.getTable() + '.' + this.$ownerKey;
        let $whereIn = this.whereInMethod(this.$related, this.$ownerKey);
        this.$query[$whereIn]($key, this.getEagerModelKeys($models));
    }

    /**
     * getEagerModelKeys method.
     * @param {*} $models
     * @returns {any}
     */
    public getEagerModelKeys($models: any) {
        let $keys = [];

        for (let $model of $models) {
            let $value = $model.getAttribute(this.$foreignKey)
            if (!is_null($value)) {
                $keys.push($value);
            }
        }

        $keys = $keys.sort();

        return $keys.filter((value, index, self) => self.indexOf(value) === index);
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
        let $foreign = this.$foreignKey;

        let $owner = this.$ownerKey;

        let $dictionary = {};

        for (let $result of $results) {
            let $attribute = this.getDictionaryKey($result.getAttribute($owner));
            $dictionary[$attribute] = $result;
        }



        for (let $model of $models) {
            let $attribute = this.getDictionaryKey($model.getAttribute($foreign));

            if (isset($dictionary[$attribute])) {
                $model.setRelation($relation, $dictionary[$attribute]);
            }
        }

        return $models;
    }


    /**
     * associate method.
     * @param {*} $model
     * @returns {any}
     */
    public associate($model: any) {
        let $ownerKey = $model instanceof Model ? ($model as any).getAttribute(this.$ownerKey) : $model;

        this.$child.setAttribute(this.$foreignKey, $ownerKey);

        if ($model instanceof Model) {
            this.$child.setRelation(this.$relationName, $model);
        } else {
            this.$child.unsetRelation(this.$relationName);
        }

        return this.$child;
    }

    /**
     * dissociate method.
     * @returns {any}
     */
    public dissociate() {
        this.$child.setAttribute(this.$foreignKey, null);

        return this.$child.setRelation(this.$relationName, null);
    }

    /**
     * disassociate method.
     * @returns {any}
     */
    public disassociate() {
        return this.dissociate();
    }

    /**
     * getRelationExistenceQuery method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @param {*} $columns
     * @returns {any}
     */
    public getRelationExistenceQuery($query: any, $parentQuery: any, $columns: any[] = ['*']) {
        if ($parentQuery.getTable() == $query.getTable()) {
            return this.getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns);
        }

        return $query.select($columns).whereColumn(
            this.getQualifiedForeignKeyName(), '=', $query.qualifyColumn(this.$ownerKey)
        );
    }

    /**
     * getRelationExistenceQueryForSelfRelation method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @param {*} $columns
     * @returns {any}
     */
    public getRelationExistenceQueryForSelfRelation($query: any, $parentQuery: any, $columns: any[] = ['*']) {
        let $hash = this.getRelationCountHash()
        $query.select($columns).from(
            $query.getModel().getTable() + ' as ' + $hash
        );

        $query.getModel().setTable($hash);

        return $query.whereColumn(
            $hash + '.' + this.$ownerKey, '=', this.getQualifiedForeignKeyName()
        );
    }

    /**
     * relationHasIncrementingId method.
     * @returns {any}
     */
    public relationHasIncrementingId() {
        return this.$related.getIncrementing() && ['int', 'integer'].includes(this.$related.getKeyType());
    }

    /**
     * newRelatedInstanceFor method.
     * @param {*} $parent
     * @returns {any}
     */
    public newRelatedInstanceFor($parent: any) {
        return this.$related.newInstance();
    }

    /**
     * getChild method.
     * @returns {any}
     */
    public getChild() {
        return this.$child;
    }

    /**
     * getForeignKeyName method.
     * @returns {any}
     */
    public getForeignKeyName() {
        return this.$foreignKey;
    }

    /**
     * getQualifiedForeignKeyName method.
     * @returns {any}
     */
    public getQualifiedForeignKeyName() {
        return this.$child.qualifyColumn(this.$foreignKey);
    }

    /**
     * getParentKey method.
     * @returns {any}
     */
    public getParentKey() {
        return this.$child[this.$foreignKey];
    }

    /**
     * getOwnerKeyName method.
     * @returns {any}
     */
    public getOwnerKeyName() {
        return this.$ownerKey;
    }

    /**
     * getQualifiedOwnerKeyName method.
     * @returns {any}
     */
    public getQualifiedOwnerKeyName() {
        return this.$related.qualifyColumn(this.$ownerKey);
    }

    /**
     * getRelatedKeyFrom method.
     * @param {*} $model
     * @returns {any}
     */
    public getRelatedKeyFrom($model: any) {
        return $model.getAttribute ? $model.getAttribute(this.$ownerKey) : $model[this.$ownerKey];
    }

    /**
     * getRelationName method.
     * @returns {any}
     */
    public getRelationName() {
        return this.$relationName;
    }
}

export default BelongsTo;
