const HasOneOrMany = require('./hasOneOrMany')

class HasMany extends HasOneOrMany {

    getResults() {
        return !is_null(this.getParentKey()) ?
            this.$query.get() :
            this.$related.newCollection();
    }

    initRelation($models, $relation) {
        for (let $model of $models) {
            $model.setRelation($relation, this.$related.newCollection());
        }

        return $models;
    }

    match($models, $results, $relation) {
        return this.matchMany($models, $results, $relation);
    }
}

module.exports = HasMany