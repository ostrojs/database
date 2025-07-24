const CollectionInterface = require('@ostro/contracts/collection/collect')
const ModelInterface = require('@ostro/contracts/database/eloquent/model')
const { omit, pick } = require('lodash')
class HasAttributes {

    static $mutatorCache = {};

    $attributes = {};

    $original = {};

    $changes = {};

    $casts = {};

    $classCastCache = [];

    static $primitiveCastTypes = [
        'array',
        'bool',
        'boolean',
        'collection',
        'custom_datetime',
        'date',
        'datetime',
        'decimal',
        'double',
        'encrypted',
        'encrypted:array',
        'encrypted:collection',
        'encrypted:json',
        'encrypted:object',
        'float',
        'int',
        'integer',
        'json',
        'object',
        'real',
        'string',
        'timestamp',
    ];

    $dates = [];

    $dateFormat = 'yyyy-MM-dd HH:mm:ss';

    $appends = {};

    static $snakeAttributes = true;

    static $encrypter;

    attributesToJson() {
        let $attributes = { ...this.getJsonableAttributes(), ...this.getJsonableAppends() }
        let $mutatedAttributes = this.getMutatedAttributes()
        $attributes = this.addMutatedAttributesToJSON(
            $attributes, $mutatedAttributes
        );
        let jsonableRelations = this.getJsonableableRelations()
        for (let $key in jsonableRelations) {
            let $value = jsonableRelations[$key]
            if ($value instanceof CollectionInterface) {
                $attributes[$key] = $value.toArray()
            } else if ($value instanceof ModelInterface) {
                $attributes[$key] = $value.toJson()
            }
        }

        return $attributes;
    }

    getJsonableAttributes() {
        return this.getJsonableItems(this.getAttributes());
    }

    getJsonableAppends() {
        if (!count(this.$appends)) {
            return [];
        }

        return this.getJsonableItems(this.$appends);
    }

    getJsonableItems($values) {
        if (count(this.getVisible()) > 0) {
            $values = pick($values, this.getVisible());
        }

        if (count(this.getHidden()) > 0) {
            $values = omit($values, this.getHidden())
        }

        return $values;
    }

    mutateAttributeForJSON($key, $value) {
        $value = this.mutateAttribute($key, $value);
        if ($value instanceof CollectionInterface) {
            return $value.toArray()
        } else if ($value instanceof ModelInterface) {
            return $value.toJson()
        }
        return $value;
    }

    getRelationValue($key) {
        if (this.relationLoaded($key)) {
            return this.getRelations()[$key];
        }
    }

    relationsToJson() {
        let $attributes = {};
        let jsonableRelations = this.getJsonableableRelations()
        for (let $key in jsonableRelations) {
            let $value = jsonableRelations[$key]

            if ($value instanceof CollectionInterface) {
                var $relation = $value.toArray();
            } else if (is_null($value)) {
                $relation = $value;
            }
            if (this.constructor.$snakeAttributes) {
                $key = String.snake($key);
            }

            if (isset($relation) || is_null($value)) {
                $attributes[$key] = $relation;
            }

            unset($relation);
        }

        return $attributes;
    }

    getJsonableableRelations() {
        return this.getJsonableItems(this.getRelations());
    }


    addMutatedAttributesToJSON($attributes, $mutatedAttributes) {
        for (let $key of $mutatedAttributes) {

            if (!$attributes.hasOwnProperty($key)) {
                continue;
            }

            $attributes[$key] = this.mutateAttributeForJSON(
                $key, $attributes[$key]
            );
        }

        return $attributes;
    }

    setRawAttributes($attributes, $sync = false) {
        this.$attributes = $attributes;

        if ($sync) {
            this.syncOriginal();
        }

        return this;
    }

    syncOriginal() {

        this.$original = { ...this.getAttributes() }
    }

    getOriginal(key) {
        return this.$original[key];
    }

    getAttributes() {

        return this.$attributes;
    }

    getAttribute($key) {
        if (!$key) {
            return;
        } else if (this.$attributes.hasOwnProperty($key) || this.hasGetMutator($key)) {
            return this.getAttributeValue($key);
        } else if (method_exists(this.constructor.class, $key)) {
            return;
        }

        return this.getRelationValue($key);
    }

    setAttribute($key, value) {
        if (this.hasSetMutator($key)) {
            return this.setMutatedAttributeValue($key, value);
        }
        return this.$attributes[$key] = value

    }

    getAttributesForInsert() {
        return this.getAttributes();
    }

    isDirty($attributes = null) {
        return this.hasChanges(
            this.getDirty(), Array.isArray($attributes) ? $attributes : arguments
        );
    }

    hasChanges($changes, $attributes = null) {

        if (empty($attributes)) {
            return count($changes) > 0;
        }

        for (let $attribute in $attributes) {
            if ($changes.hasOwnProperty($attribute)) {
                return true;
            }
        }

        return false;
    }

    getDirty() {
        let $dirty = {};
        let $attributes = this.getAttributes()

        for (let $key in $attributes) {
            let $value = $attributes[$key]

            if (!this.originalIsEquivalent($key)) {
                $dirty[$key] = $value;
            }
        }

        return $dirty;
    }

    getChanges() {
        return this.$changes;
    }

    originalIsEquivalent($key) {
        if (!this.$original.hasOwnProperty($key)) {
            return false;
        }

        let $attribute = this.$attributes[$key];
        let $original = this.$original[$key];

        if ($attribute === $original) {
            return true;
        } else if (is_null($attribute)) {
            return false;
        }

        return $attribute == $original;
    }

    hasGetMutator($key) {
        return method_exists(this, 'get' + $key.studly() + 'Attribute');
    }

    mutateAttribute($key, $value) {
        return this['get' + $key.studly() + 'Attribute']($value);
    }

    hasSetMutator($key) {
        return method_exists(this, 'set' + $key.studly() + 'Attribute');
    }

    setMutatedAttributeValue($key, $value) {
        return this['set' + $key.studly() + 'Attribute']($value);
    }

    transformModelValue($key, $value) {

        if (this.hasGetMutator($key)) {
            return this.mutateAttribute($key, $value);
        }

        return $value;
    }

    getAttributeFromObject($key) {
        return this.getAttributes()[$key];
    }

    getAttributeValue($key) {
        return this.transformModelValue($key, this.getAttributeFromObject($key));
    }

    getMutatedAttributes() {
        let $class = this.constructor;

        if (!isset(this.constructor.$mutatorCache[$class.name])) {
            this.constructor.cacheMutatedAttributes($class);
        }
        return this.constructor.$mutatorCache[$class.name];
    }

    syncChanges() {
        this.$changes = this.getDirty();

        return this;
    }

    static cacheMutatedAttributes($class) {
        this.$mutatorCache[$class.name] = collect(this.getMutatorMethods($class)).map(($match) => {
            return (this.$snakeAttributes ? $match.snake() : $match).lowerFirst();
        }).all();
    }

    static getMutatorMethods($class) {
        let $matches = [...(Object.getOwnPropertyNames($class.prototype).join(';')).matchAll(/(?<=^|;)get([^;]+?)Attribute(;|$)/g)];

        return $matches.map(arr => arr[1]);
    }

}

module.exports = HasAttributes
