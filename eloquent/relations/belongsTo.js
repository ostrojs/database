const Model = require('@ostro/contracts/database/eloquent/model')

const Relation = require('./relation')
const SupportsDefaultModels = require('./concerns/supportsDefaultModels')

class BelongsTo extends implement(Relation, SupportsDefaultModels) {

    $child;

    $foreignKey;

    $ownerKey;

    $relationName;

    constructor($query, $child, $foreignKey, $ownerKey, $relationName) {
        super($query, $child);

        this.$ownerKey = $ownerKey;
        this.$relationName = $relationName;
        this.$foreignKey = $foreignKey;

        this.$child = $child;

    }

    getResults() {
        if (is_null(this.$child[this.$foreignKey])) {
            return this.getDefaultFor(this.$parent);
        }

        return this.$query.first() || this.getDefaultFor(this.$parent);
    }

    addConstraints() {
        if (this.$constraints) {

            let $table = this.$related.getTable();

            this.$query.where($table + '.' + this.$ownerKey, '=', this.$child[this.$foreignKey]);
        }
    }

    addEagerConstraints($models) {

        let $key = this.$related.getTable() + '.' + this.$ownerKey;
        let $whereIn = this.whereInMethod(this.$related, this.$ownerKey);
        this.$query[$whereIn]($key, this.getEagerModelKeys($models));
    }

    getEagerModelKeys($models) {
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

    initRelation($models, $relation) {
        for (let $model of $models) {
            $model.setRelation($relation, this.getDefaultFor($model));
        }

        return $models;
    }

    match($models, $results, $relation) {
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


    associate($model) {
        let $ownerKey = $model instanceof Model ? $model.getAttribute(this.$ownerKey) : $model;

        this.$child.setAttribute(this.$foreignKey, $ownerKey);

        if ($model instanceof Model) {
            this.$child.setRelation(this.$relationName, $model);
        } else {
            this.$child.unsetRelation(this.$relationName);
        }

        return this.$child;
    }

    dissociate() {
        this.$child.setAttribute(this.$foreignKey, null);

        return this.$child.setRelation(this.$relationName, null);
    }

    disassociate() {
        return this.dissociate();
    }

    getRelationExistenceQuery($query, $parentQuery, $columns = ['*']) {
        if ($parentQuery.getQuery().from == $query.getQuery().from) {
            return this.getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns);
        }

        return $query.select($columns).whereColumn(
            this.getQualifiedForeignKeyName(), '=', $query.qualifyColumn(this.$ownerKey)
        );
    }

    getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns = ['*']) {
        let $hash = this.getRelationCountHash()
        $query.select($columns).from(
            $query.getModel().getTable() + ' as ' + $hash
        );

        $query.getModel().setTable($hash);

        return $query.whereColumn(
            $hash + '.' + this.$ownerKey, '=', this.getQualifiedForeignKeyName()
        );
    }

    relationHasIncrementingId() {
        return this.$related.getIncrementing() && ['int', 'integer'].includes(this.$related.getKeyType());
    }

    newRelatedInstanceFor($parent) {
        return this.$related.newInstance();
    }

    getChild() {
        return this.$child;
    }

    getForeignKeyName() {
        return this.$foreignKey;
    }

    getQualifiedForeignKeyName() {
        return this.$child.qualifyColumn(this.$foreignKey);
    }

    getParentKey() {
        return this.$child[this.$foreignKey];
    }

    getOwnerKeyName() {
        return this.$ownerKey;
    }

    getQualifiedOwnerKeyName() {
        return this.$related.qualifyColumn(this.$ownerKey);
    }

    getRelatedKeyFrom($model) {
        return $model[this.$ownerKey];
    }

    getRelationName() {
        return this.$relationName;
    }
}

module.exports = BelongsTo
