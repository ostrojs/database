const { Macroable } = require('@ostro/support/macro')
const Query = require('../query/builder')
const MethodNotAvailable = require('@ostro/support/exceptions/methodNotAvailable')
const DateTime = require('@ostro/support/facades/date')
const GuardsAttributes = require('./concern/guardsAttributes')
const HasRelationships = require('./concern/hasRelationships')
const HidesAttributes = require('./concern/hidesAttributes')
const QueriesRelationships = require('./concern/queriesRelationships')
const HasAttributes = require('./concern/hasAttributes')
const HasTimestamps = require('./concern/hasTimestamps')
const BelongsToMany = require('./relations/belongsToMany')
const Relation = require('./relations/relation')
const RelationNotFoundException = require('./relationNotFoundException')
const kResolver = Symbol('resolver')
const kQuery = Symbol('query')
const kEagerLoad = Symbol('eagerLoad')
const kModel = Symbol('model')
const kWasRecentlyCreated = Symbol('wasRecentlyCreated')
const Collection = require('./collection')
const ModelInterface = require('@ostro/contracts/database/eloquent/model')
const CollectionInterface = require('@ostro/contracts/collection/collect')

class Model extends implement(ModelInterface, Query, GuardsAttributes, QueriesRelationships, HasRelationships, HasAttributes, HidesAttributes, HasTimestamps) {

    $table = String.snakeCase(this.constructor.name).toLowerCase().plural();

    get $query() {
        return this[kQuery] = this[kQuery] || Model.getConnectionResolver().table(this.$table)
    }
    set $query($value) {
        return this[kQuery] = $value
    }

    $connection = '';

    $primaryKey = 'id';

    $keyType = 'string';

    CREATED_AT = 'created_at';

    UPDATED_AT = 'updated_at';

    $incrementing = true;

    static[kResolver] = null;

    $exists = true;

    [kEagerLoad] = {};

    [kWasRecentlyCreated] = false;

    [kModel] = null;

    constructor($attributes = {}) {
        super()

        Object.defineProperty(this, kQuery, { value: null, writable: true })
        this.fill($attributes);
    }

    raw() {
        return Model.getConnectionResolver().raw(...arguments)
    }

    getConnection() {

        return this.constructor.resolveConnection(this.getConnectionName());
    }

    getConnectionName() {
        return this.$connection;
    }

    setConnection($name) {
        
        this.$connection = $name;

        return this;
    }

    static resolveConnection($connection = null) {
        return this[kResolver].connection($connection);
    }

    static getConnectionResolver() {
        return this[kResolver];
    }

    static setConnectionResolver($resolver) {
        this[kResolver] = $resolver;
    }

    static unsetConnectionResolver() {
        this[kResolver] = null;
    }

    fillable(obj = {}) {
        let fillKeys = Object.keys(obj)
        let $massAssign = this.$fillable.intersection(fillKeys)
        if ($massAssign.length == 0 && fillKeys.length) {
            throw Error('Add column to fillable property to allow mass assignment on [' + this.constructor.name + '].')
        }
        for (let fillable of $massAssign) {
            if (obj.hasOwnProperty(fillable)) {
                let fn = this['set' + fillable.ucfirst() + 'Attribute']
                if (typeof fn == 'function') {
                    this['set' + fillable.ucfirst() + 'Attribute'](obj[fillable])
                } else {
                    this.$attributes[fillable] = obj[fillable]
                }
            }

        }

    }

    fill($attributes = {}) {
        let $totallyGuarded = this.totallyGuarded();
        let $fillableAttributes = this.fillableFromArray($attributes)
        for (let $key in $attributes) {
            let $value = $attributes[$key]
            if (this.isFillable($key)) {
                this.setAttribute($key, $value);
            } else if ($totallyGuarded) {
                throw new Error(sprintf(
                    'Add [%s] to fillable property to allow mass assignment on [%s].',
                    $key, get_class(this)
                ));
            }
        }

        return this;
    }

    addTimestampsToInsertValues(datas) {
        if (this.$timestamps == true) {
            let datetime = DateTime.now()
            datas = !Array.isArray(datas) ? [datas] : datas
            for (var i = 0; i < datas.length; i++) {
                datas[i][this.CREATED_AT] = datetime
                datas[i][this.UPDATED_AT] = datetime
            }
        }

    }

    updateInserdtId($datas, $ids) {
        for (var i = 0; i < $datas.length; i++) {
            $datas[i][this.$primaryKey] = $ids[i]
        }
    }

    getTable() {
        return this.$table;
    }

    setTable($table) {
        this.$table = $table;
        return this;
    }

    getKeyName() {
        return this.$primaryKey;
    }

    setKeyName($key) {
        this.$primaryKey = $key;

        return this;
    }

    getKeyType() {
        return this.$keyType;
    }

    setKeyType($type) {
        this.$keyType = $type;

        return this;
    }

    getKey() {
        return this.getAttribute(this.getKeyName());
    }

    first() {
        this.$query.limit(1)
        return this.get().then(res => {
            if (res.length) {
                return res[0]
            }
            return null
        })

    }

    forceFill($attributes) {
        return this.constructor.unguarded(() => {
            return this.fill($attributes);
        });
    }
    create(data = {}) {
        if (typeof data != 'object' || Array.isArray(data))
            throw Error('Only json object allowed')
        this.fillable(data)
        this.addTimestampsToInsertValues(this.$attributes)
        return this.$query.insert(this.$attributes).then(res => {
            this.updateInserdtId([this.$attributes], res)
            return this
        })
    }

    upsert(datas, $uniqueBy, $update = null) {

        throw Error('Under development')
    }

    insert($values) {
        this.addTimestampsToInsertValues($values)
        return this.$query.insert($values).then($ids => {
            this.updateInserdtId($values, $ids)
            return $values
        })
    }

    createSelectWithConstraint($name) {
        return [$name.split(':')[0], function($query) {
            $query.select($name.split(':')[1].split(',').map(function($column) {
                if (String.contains($column, '.')) {
                    return $column;
                }

                return $query instanceof BelongsToMany ?
                    $query.getRelated().getTable() + '.' + $column :
                    $column;
            }));
        }];
    }

    parseWithRelations($relations) {
        let $results = [];
        $relations = Array.isArray($relations) ? { ...$relations } : $relations
        for (let $name in $relations) {
            let $constraints = $relations[$name]

            if (is_numeric($name)) {
                $name = $constraints;

                [$name, $constraints] = String.contains($name, ':') ?
                    this.createSelectWithConstraint($name) : [$name, function() {}];
            }

            $results = this.addNestedWiths($name, $results);
            $results[$name] = $constraints;
        }

        return $results;
    }

    addNestedWiths($name, $results = {}) {
        let $progress = [];

        for (let $segment of $name.split('.')) {
            $progress.push($segment);
            let $last = $progress.join('.')
            if (!isset($results[$last])) {
                $results[$last] = function() {
                    //
                };
            }
        }

        return $results;
    }

    with($relations, $callback = null) {
        let $eagerLoad = null
        if (typeof $callback == 'function') {
            $eagerLoad = this.parseWithRelations({
                [$relations]: $callback
            });
        } else {
            $eagerLoad = this.parseWithRelations(is_string($relations) ? [...arguments] : $relations);
        }
        this[kEagerLoad] = Object.assign(this[kEagerLoad], $eagerLoad);

        return this;
    }

    defaultKeyName() {
        return this.getModel().getKeyName();
    }

    getModel() {
        return this[kModel] || this;
    }

    setModel($model) {
        this[kModel] = $model;

        this.$query.from($model.getTable());

        return this;
    }

    instanceValues($values) {
        return $values.map($value => {
            let $instance = this.newInstance()
            return $instance
        })
    }

    newInstance(attributes, $exists = false) {

        let $model = new(this.constructor)(attributes)
        $model.$exists = $exists;

        $model.setConnection(
            this.getConnectionName()
        );

        $model.setTable(this.getTable());
        return $model
    }

    newModelInstance($attributes) {
        return this.newInstance($attributes).setConnection(
            this.getConnection().getName()
        );
    }

    newModelQuery() {
        return this.newEloquentBuilder(
            this.newBaseQueryBuilder()
        ).setModel(this);
    }
    newBaseQueryBuilder() {
        return Model.getConnectionResolver().table(this.$table)
    }
    newEloquentBuilder($query) {
        this.$query = $query
        return this
    }

    hydrate($items) {
        let $instance = this.newInstance();

        return $instance.newCollection($items.map(function($item) {
            return $instance.newFromBuilder($item);
        }));
    }

    newCollection($data) {
        return Collection.collect($data || [])
    }

    async getModels() {
        return this.hydrate(
            await this.$query.get()
        );
    }

    newFromBuilder($attributes = [], $connection = null) {
        let $model = this.newInstance({}, true);
        $model.setRawAttributes(Object.assign($attributes, this.$attributes), true);
        $model.setConnection($connection || this.getConnectionName());

        return $model;
    }

    newQueryWithoutRelationships() {
        return this.newModelQuery();
    }

    getQuery() {
        return this.$query.$query
    }

    qualifyColumn($column) {
        if (String.contains($column, '.')) {
            return $column;
        }

        return this.getTable() + '.' + $column;
    }

    isNestedUnder($relation, $name) {
        return String.contains($name, '.') && String.startsWith($name, $relation + '.');
    }

    relationsNestedUnder($relation) {
        let $nested = [];

        for (let $name in this[kEagerLoad]) {
            let $constraints = this[kEagerLoad][$name]
            if (this.isNestedUnder($relation, $name)) {
                $nested[$name.substr(($relation + '.').length)] = $constraints;
            }
        }

        return $nested;
    }

    getForeignKey() {
        return String.snakeCase(class_basename(this)) + '_' + this.getKeyName();
    }

    getRelation($name) {

        let $relation = Relation.noConstraints(() => {
            let instance = this.getModel().newInstance()
            if (typeof instance[$name] != 'function') {
                throw RelationNotFoundException.make(this.getModel(), $name);

            }
            try {
                return instance[$name]()
            } catch (err) {
                console.error(err)
            }
        });

        let $nested = this.relationsNestedUnder($name);

        if (count($nested) > 0) {
            $relation.getQuery().with($nested);
        }

        return $relation;
    }

    toJSON() {
        return this.serialize()
    }

    serialize() {
        return this.toJson()
    }

    toJson() {
        return this.attributesToJson();
    }

    async eagerLoadRelation($models, $name, $constraints) {

        let $relation = this.getRelation($name);
        $relation.addEagerConstraints($models);

        $constraints($relation);

        $relation = await $relation.match(
            $relation.initRelation($models, $name),
            await $relation.getEager(),
            $name
        );
        return $relation;
    }

    async eagerLoadRelations($models) {
        for (let $name in this[kEagerLoad]) {
            let $constraints = this[kEagerLoad][$name]

            if ($name.includes('.') === false) {
                $models = await this.eagerLoadRelation($models, $name, $constraints);
            }
        }
        return $models;
    }

    async get() {
        let $models = await this.getModels()
        if ($models.length > 0) {
            $models = await this.eagerLoadRelations($models);

        }
        return $models
    }

    async save($options = {}) {
        let $saved = false

        let $query = this.newModelQuery();

        if (this.$exists) {
            $saved = this.isDirty() ?
                await this.performUpdate($query) : true;
        } else {
            $saved = await this.performInsert($query);
            let $connection = $query.getConnection()
            if (!this.getConnectionName() && $connection) {
                this.setConnection($connection.getName());
            }
        }

        if ($saved) {
            this.finishSave($options);
        }

        return $saved;
    }

    finishSave($options = {}) {

        if (this.isDirty() && ($options['touch'] || true)) {
            this.touchOwners();
        }

        this.syncOriginal();
    }

    async performUpdate($query) {

        if (this.usesTimestamps()) {
            this.updateTimestamps();
        }

        let $dirty = this.getDirty();

        if (count($dirty) > 0) {
            await this.setKeysForSaveQuery($query).update($dirty);

            this.syncChanges();
        }

        return true;
    }

    setKeysForSaveQuery($query) {
        $query.where(this.getKeyName(), this.getKeyForSaveQuery());

        return $query;
    }

    getKeyForSaveQuery() {
        return this.$original[this.getKeyName()] || this.getKey();
    }

    getIncrementing() {
        return this.$incrementing;
    }

    async insertAndSetId($query, $attributes) {
        let $keyName = this.getKeyName()
        $attributes = await $query.insert([$attributes]);
        this.setRawAttributes($attributes[0]);
    }

    async performInsert($query) {

        if (this.usesTimestamps()) {
            this.updateTimestamps();
        }

        let $attributes = this.getAttributesForInsert();

        if (this.getIncrementing()) {
            await this.insertAndSetId($query, $attributes);
        } else {
            if (empty($attributes)) {
                return true;
            }

            $query.insert($attributes);
        }

        this.$exists = true;

        this[kWasRecentlyCreated] = true;

        return true;
    }

    async delete() {

        if (is_null(this.getKeyName())) {
            throw new Error('No primary key defined on model.');
        } else if (!this.$exists) {
            return;
        }

        this.touchOwners();

        await this.performDeleteOnModel();

        return true;

    }

    async performDeleteOnModel() {
        await this.$query.delete()

        this.$exists = false;
    }

    firstOrCreate(where, create = {}) {
        return this.where(where).first().then(res => {
            if (!res) {
                return this.create({ ...where, ...create })
            }
            return res
        })
    }

    updateOrCreate(where = {}, update = {}) {
        return this.where(where).first().then(async res => {

            if (res) {
                if (this.$timestamps)
                    update[this.UPDATED_AT] = DateTime.now()
                return res.where(where).update(update);
            }

            return this.create({ ...where, ...update })
        })
    }

    destroy(id) {
        let where = {
            [this.$primaryKey]: id
        }
        return this.where(where).delete()
    }

    find($id) {
        return this.where({
            [this.$primaryKey]: $id
        }).first()

    }

    __set(target, key, value) {
        if (!target.$exists) {
            throw Error('Instance is not alive.')
        }
        if (typeof key == 'symbol') {
            return target[key] = value
        }
        return target.setAttribute(key, value)
    }
    __get(target, key) {
        return target.getAttribute(key)
    }

    static __call(target, method, args) {

        target = (new target())

        if (typeof target[method] == 'function') {
            return target[method](...args)

        }

        throw new MethodNotAvailable('Method [' + method + '] was not available on [' + target.constructor.name + ']')
    }

}

module.exports = Macroable(Model)