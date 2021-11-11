const HasManyThrough = require('./hasManyThrough')
const SupportsDefaultModels = require('./concerns/supportsDefaultModels')
const InteractsWithDictionary = require('./concerns/interactsWithDictionary')
class HasOneThrough extends implement(HasManyThrough, SupportsDefaultModels, InteractsWithDictionary) {

    getResults() {
        return this.first() || this.getDefaultFor(this.farParent);
    }

    initRelation($models, $relation) {
        for (let $model of $models) {
            $model.setRelation($relation, this.getDefaultFor($model));
        }

        return $models;
    }

    match($models, $results, $relation) {
        let $dictionary = this.buildDictionary($results);

        for (let $model of $models) {
            let $key = this.getDictionaryKey($model.getAttribute(this.$localKey))
            if (isset($dictionary[$key])) {
                let $value = $dictionary[$key];
                $model.setRelation(
                    $relation, $value
                );
            }
        }

        return $models;
    }

    newRelatedInstanceFor($parent) {
        return this.$related.newInstance();
    }
}

module.exports = HasOneThrough