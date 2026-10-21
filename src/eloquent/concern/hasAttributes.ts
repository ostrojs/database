import { isset, is_null, count, empty, method_exists, collect } from '@ostro/support/function';
import { studly, snake, lowerFirst } from '@ostro/support/string';
import CollectionInterface from '@ostro/contracts/collection/collect';
import ModelInterface from '@ostro/contracts/database/eloquent/model';
import { omit, pick } from 'lodash';
/**
 * Class HasAttributes.
 */
class HasAttributes {
    [key: string]: any;
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

    /**
     * attributesToJson method.
     * @returns {any}
     */
    public attributesToJson() {
        let $attributes = { ...this.getJsonableAttributes(), ...this.getJsonableAppends() }
        let $mutatedAttributes = this.getMutatedAttributes()
        for (let $key of $mutatedAttributes) {
            if (this.$attributes.hasOwnProperty($key)) {
                $attributes[$key] = this.getAttributeValue($key);
            }
        }
        $attributes = this.getJsonableItems($attributes);
        let jsonableRelations = this.getJsonableableRelations()
        for (let $key in jsonableRelations) {
            let $value = jsonableRelations[$key]
            if ($value instanceof CollectionInterface) {
                $attributes[$key] = ($value as any).toArray()
            } else if ($value instanceof ModelInterface) {
                $attributes[$key] = ($value as any).toJson()
            }
        }

        return $attributes;
    }

    /**
     * getJsonableAttributes method.
     * @returns {any}
     */
    public getJsonableAttributes() {
        return this.getJsonableItems(this.getAttributes());
    }

    /**
     * getJsonableAppends method.
     * @returns {any}
     */
    public getJsonableAppends() {
        if (!count(this.$appends)) {
            return [];
        }

        return this.getJsonableItems(this.$appends);
    }

    /**
     * getJsonableItems method.
     * @param {*} $values
     * @returns {any}
     */
    public getJsonableItems($values: Record<string, any>) {
        if (count(this.getVisible()) > 0) {
            $values = pick($values, this.getVisible());
        }

        if (count(this.getHidden()) > 0) {
            $values = omit($values, this.getHidden())
        }

        return $values;
    }

    /**
     * mutateAttributeForJSON method.
     * @param {*} $key
     * @param {*} $value
     * @returns {any}
     */
    public mutateAttributeForJSON($key: string, $value: any) {
        $value = this.mutateAttribute($key, $value);
        if ($value instanceof CollectionInterface) {
            return ($value as any).toArray()
        } else if ($value instanceof ModelInterface) {
            return ($value as any).toJson()
        }
        return $value;
    }

    /**
     * getRelationValue method.
     * @param {*} $key
     * @returns {any}
     */
    public getRelationValue($key: string) {
        if (this.relationLoaded($key)) {
            return this.getRelations()[$key];
        }
    }

    /**
     * relationsToJson method.
     * @returns {any}
     */
    public relationsToJson() {
        let $attributes = {};
        let jsonableRelations = this.getJsonableableRelations()
        for (let $key in jsonableRelations) {
            let $value = jsonableRelations[$key];
            let $relation;

            if ($value instanceof CollectionInterface) {
                $relation = ($value as any).toArray();
            } else if (is_null($value)) {
                $relation = $value;
            }
            if ((this.constructor as any).$snakeAttributes) {
                $key = snake($key);
            }

            if (isset($relation) || is_null($value)) {
                $attributes[$key] = $relation;
            }
        }

        return $attributes;
    }

    /**
     * getJsonableableRelations method.
     * @returns {any}
     */
    public getJsonableableRelations() {
        return this.getJsonableItems(this.getRelations());
    }


    /**
     * addMutatedAttributesToJSON method.
     * @param {*} $attributes
     * @param {*} $mutatedAttributes
     * @returns {any}
     */
    public addMutatedAttributesToJSON($attributes: Record<string, any>, $mutatedAttributes: any) {
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

    /**
     * setRawAttributes method.
     * @param {*} $attributes
     * @param {*} $sync
     * @returns {any}
     */
    public setRawAttributes($attributes: Record<string, any>, $sync: boolean = false) {
        this.$attributes = $attributes;

        if ($sync) {
            this.syncOriginal();
        }

        return this;
    }

    /**
     * syncOriginal method.
     * @returns {any}
     */
    public syncOriginal() {

        this.$original = { ...this.getAttributes() }
    }

    /**
     * getOriginal method.
     * @param {*} key
     * @returns {any}
     */
    public getOriginal(key: string) {
        return this.$original[key];
    }

    /**
     * getAttributes method.
     * @returns {any}
     */
    public getAttributes() {

        return this.$attributes;
    }

    /**
     * getAttribute method.
     * @param {*} $key
     * @returns {any}
     */
    public getAttribute($key: string) {
        if (!$key) {
            return;
        } else if (this.$attributes.hasOwnProperty($key) || this.hasGetMutator($key)) {
            return this.getAttributeValue($key);
        } else if (typeof this[$key] === 'function') {
            return;
        }

        return this.getRelationValue($key);
    }

    /**
     * setAttribute method.
     * @param {*} $key
     * @param {*} value
     * @returns {any}
     */
    public setAttribute($key: string, value: any) {
        if (this.hasSetMutator($key)) {
            return this.setMutatedAttributeValue($key, value);
        }
        return this.$attributes[$key] = value

    }

    /**
     * getAttributesForInsert method.
     * @returns {any}
     */
    public getAttributesForInsert() {
        return this.getAttributes();
    }

    /**
     * isDirty method.
     * @param {*} $attributes
     * @returns {any}
     */
    public isDirty($attributes: any = null) {
        const attrs = Array.isArray($attributes) ? $attributes : (arguments.length === 1 && typeof $attributes === 'string' ? [$attributes] : Array.from(arguments));
        return this.hasChanges(
            this.getDirty(), attrs
        );
    }

    /**
     * isClean method.
     * @param {*} $attributes
     * @returns {any}
     */
    public isClean($attributes: any = null) {
        return !this.isDirty(...arguments);
    }

    /**
     * hasChanges method.
     * @param {*} $changes
     * @param {*} $attributes
     * @returns {any}
     */
    public hasChanges($changes: any, $attributes: any = null) {

        if (empty($attributes)) {
            return count($changes) > 0;
        }

        for (let $attribute of $attributes) {
            if ($changes.hasOwnProperty($attribute)) {
                return true;
            }
        }

        return false;
    }

    /**
     * getDirty method.
     * @returns {any}
     */
    public getDirty() {
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

    /**
     * getChanges method.
     * @returns {any}
     */
    public getChanges() {
        return this.$changes;
    }

    /**
     * originalIsEquivalent method.
     * @param {*} $key
     * @returns {any}
     */
    public originalIsEquivalent($key: string) {
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

    /**
     * hasGetMutator method.
     * @param {*} $key
     * @returns {any}
     */
    public hasGetMutator($key: string) {
        return method_exists(this, 'get' + studly($key) + 'Attribute');
    }

    /**
     * mutateAttribute method.
     * @param {*} $key
     * @param {*} $value
     * @returns {any}
     */
    public mutateAttribute($key: string, $value: any) {
        return this['get' + studly($key) + 'Attribute']($value);
    }

    /**
     * hasSetMutator method.
     * @param {*} $key
     * @returns {any}
     */
    public hasSetMutator($key: string) {
        return method_exists(this, 'set' + studly($key) + 'Attribute');
    }

    /**
     * setMutatedAttributeValue method.
     * @param {*} $key
     * @param {*} $value
     * @returns {any}
     */
    public setMutatedAttributeValue($key: string, $value: any) {
        return this['set' + studly($key) + 'Attribute']($value);
    }

    /**
     * hasCast method.
     * @param {*} $key
     * @returns {any}
     */
    public hasCast($key: string) {
        return this.$casts && this.$casts.hasOwnProperty($key);
    }

    /**
     * getCasts method.
     * @returns {any}
     */
    public getCasts() {
        return this.$casts || {};
    }

    /**
     * castAttribute method.
     * @param {*} $key
     * @param {*} $value
     * @returns {any}
     */
    public castAttribute($key: string, $value: any) {
        if ($value === null || $value === undefined) {
            return $value;
        }
        let castType = this.$casts[$key];
        switch (castType) {
            case 'int':
            case 'integer':
                return parseInt($value, 10);
            case 'real':
            case 'float':
            case 'double':
                return parseFloat($value);
            case 'string':
                return String($value);
            case 'bool':
            case 'boolean':
                return Boolean($value);
            case 'object':
            case 'json':
            case 'array':
                return typeof $value === 'string' ? JSON.parse($value) : $value;
            default:
                return $value;
        }
    }

    /**
     * transformModelValue method.
     * @param {*} $key
     * @param {*} $value
     * @returns {any}
     */
    public transformModelValue($key: string, $value: any) {

        if (this.hasGetMutator($key)) {
            return this.mutateAttribute($key, $value);
        }

        if (this.hasCast($key)) {
            return this.castAttribute($key, $value);
        }

        return $value;
    }

    /**
     * getAttributeFromObject method.
     * @param {*} $key
     * @returns {any}
     */
    public getAttributeFromObject($key: string) {
        return this.getAttributes()[$key];
    }

    /**
     * getAttributeValue method.
     * @param {*} $key
     * @returns {any}
     */
    public getAttributeValue($key: string) {
        return this.transformModelValue($key, this.getAttributeFromObject($key));
    }

    /**
     * getMutatedAttributes method.
     * @returns {any}
     */
    public getMutatedAttributes() {
        let $class = Object.getPrototypeOf(this).constructor;

        if (!isset(HasAttributes.$mutatorCache[$class.name])) {
            $class.cacheMutatedAttributes($class);
        }
        return HasAttributes.$mutatorCache[$class.name];
    }

    /**
     * syncChanges method.
     * @returns {any}
     */
    public syncChanges() {
        this.$changes = this.getDirty();

        return this;
    }

    /**
     * cacheMutatedAttributes method.
     * @static
     * @param {*} $class
     * @returns {any}
     */
    static cacheMutatedAttributes($class: any) {
        HasAttributes.$mutatorCache[$class.name] = collect(this.getMutatorMethods($class)).map(($match) => {
            return lowerFirst(this.$snakeAttributes ? snake($match) : $match);
        }).all();
    }

    /**
     * getMutatorMethods method.
     * @static
     * @param {*} $class
     * @returns {any}
     */
    static getMutatorMethods($class: any) {
        let $matches = [...(Object.getOwnPropertyNames($class.prototype).join(';')).matchAll(/(?<=^|;)get([^;]+?)Attribute(;|$)/g)];

        return $matches.map(arr => arr[1]);
    }

}

export default HasAttributes;
