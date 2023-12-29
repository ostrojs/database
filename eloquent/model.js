const { Macroable } = require('@ostro/support/macro')
const Query = require('../query/builder')
const MethodNotAvailable = require('@ostro/support/exceptions/methodNotAvailable')
const DateTime = require('@ostro/support/dateTime')
const GuardsAttributes = require('./concern/guardsAttributes')
const HasRelationships = require('./concern/hasRelationships')
const HidesAttributes = require('./concern/hidesAttributes')
const QueriesRelationships = require('./concern/queriesRelationships')
const HasAttributes = require('./concern/hasAttributes')
const HasTimestamps = require('./concern/hasTimestamps')
const BelongsToMany = require('./relations/belongsToMany')
const Relation = require('./relations/relation')
const RelationNotFoundException = require('./relationNotFoundException')
const ModelNotFoundException = require('./modelNotFoundException')
const kResolver = Symbol('resolver')
const kQuery = Symbol('query')
const kEagerLoad = Symbol('eagerLoad')
const kModel = Symbol('model')
const kScopes = Symbol('scopes')
const kRemovedScopes = Symbol('removeScopes')
const kWasRecentlyCreated = Symbol('wasRecentlyCreated')
const kPerformRelationQuery = Symbol('performRelationQuery')
const kLazyQueries = Symbol('lazyQueries')
const Collection = require('./collection')
const ModelInterface = require('@ostro/contracts/database/eloquent/model')
const { is_array, count, in_array, clone } = require('@ostro/support/function')

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

	static [kResolver] = null;

	$exists = false;

	[kScopes] = {};
	[kRemovedScopes] = [];
	[kEagerLoad] = {};

	[kLazyQueries] = [];

	[kWasRecentlyCreated] = false;

	[kModel] = null;


	constructor($attributes = {}, newInstance = true) {
		super()
		Object.defineProperty(this, kQuery, { value: null, writable: true });
		const instance = newInstance == true ? this.newInstance($attributes, this.$exists, false) : this;
		if (instance.$fillable.length) {
			instance.fill($attributes);
		}

		return instance
	}

	raw() {
		return Model.getConnectionResolver().raw(...arguments)
	}

	getConnection() {

		return get_class(this).resolveConnection(this.getConnectionName());
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
					this.setAttribute(fillable, obj[fillable])
				}
			}

		}

	}

	fill($attributes = {}) {
		let $totallyGuarded = this.totallyGuarded();
		let $fillableAttributes = this.fillableFromArray($attributes)
		for (let $key of $fillableAttributes) {
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
			let datetime = DateTime.now().toString();
			datas = !Array.isArray(datas) ? [datas] : datas;
			for (var i = 0; i < datas.length; i++) {
				datas[i][this.CREATED_AT] = datetime
				datas[i][this.UPDATED_AT] = datetime
			}
		}

	}

	updateInserdtId($datas, $ids) {
		const keys = this.getKeyName();
		for (var i = 0; i < $datas.length; i++) {
			let value = $ids[i];
			if (Array.isArray(keys)) {
				for (let key of keys) {
					if (typeof value == 'object') {
						value = value[key]
					}
					$datas[i][key] = value
				}
			} else {
				if (typeof value == 'object') {
					value = value[keys]
				}
				$datas[i][keys] = value
			}

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
		this.addTimestampsToInsertValues(this.getAttributes())
		return this.$query.insert(this.getAttributes()).then(res => {
			this.updateInserdtId([this.getAttributes()], res)
			return this
		})
	}

	upsert(datas, $uniqueBy, $update = null) {

		throw Error('Under development')
	}

	async insert($values, $ids) {
		this.addTimestampsToInsertValues($values)
		let query = this.$query.insert($values)
		if ($ids) {
			query.returning($ids)
		}
		return query.then($ids => {
			this.updateInserdtId($values, $ids)
			return $values
		})
	}

	createSelectWithConstraint($name) {
		return [$name.split(':')[0], function ($query) {
			$query.select($name.split(':')[1].split(',').map(function ($column) {
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
		let $results = {};
		$relations = Array.isArray($relations) ? { ...$relations } : $relations
		for (let $name in $relations) {
			let $constraints = $relations[$name]

			if (is_numeric($name)) {
				$name = $constraints;

				[$name, $constraints] = String.contains($name, ':') ?
					this.createSelectWithConstraint($name) : [$name, function () { }];
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
				$results[$last] = function () {
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

	newInstance(attributes, $exists = false, newInstance = false) {

		let $model = new (this.constructor)(attributes, newInstance)
		$model.$exists = $exists;

		$model.setConnection(
			this.getConnectionName()
		);

		$model.setTable(this.getTable());
		return $model
	}

	newModelInstance($attributes) {
		const $instance = this.newInstance();
		$instance.fill($attributes);
		return $instance.setConnection(
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
		const $model = this.newInstance()
		$model.$query = $query
		return $model
	}

	hydrate($items) {

		let $instance = this.newInstance();
		return $instance.newCollection($items.map(function ($item) {
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

	newFromBuilder($attributes = {}, $connection = null) {
		let $model = this.newInstance({}, true, false);
		$model.setRawAttributes($attributes, true);
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
		let $nested = {};

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
			return instance[$name]()
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

	clone() {
		const $model = this.newModelInstance();
		$model.$query.$query = this.getQuery().clone();
		$model.forceFill(clone(this.$attributes));
		return $model;

	}

	withAttributes(skipColumns = [], withTimestamp = false) {
		const $attributes = this.getAttributes();

		if (typeof skipColumns == "boolean") {
			withTimestamp = skipColumns;
		}
		if (withTimestamp === false) {
			skipColumns.push(this.CREATED_AT);
			skipColumns.push(this.UPDATED_AT);
		}
		const filteredAttributes = Object.keys($attributes).reduce((result, key) => {
			if (!skipColumns.includes(key)) {
				result[key] = $attributes[key];
			}
			return result;
		}, {});

		this.where(filteredAttributes);

		return this
	}

	async get() {
		let $models = await this.getModels();
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
			await this[kPerformRelationQuery]()
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
		const keys = this.getKeyName();
		const obj = {

		};
		if (Array.isArray(keys)) {
			for (let key of keys) {
				obj[key] = this.getKeyForSaveQuery(key)
			}
		} else {
			obj[keys] = this.getKeyForSaveQuery()
		}
		$query.where(obj);

		return $query;
	}


	getKeyForSaveQuery(key) {
		return this.getOriginal(key || this.getKeyName()) || this.getKey();
	}

	getIncrementing() {
		return this.$incrementing;
	}

	async insertAndSetId($query, $attributes) {
		let $keyName = this.getKeyName();
		const $id = await $query.insert([$attributes], $keyName);
		if (Array.isArray($keyName)) {
			for (let key of $keyName) {
				return this.setAttribute(key, $id[0][key]);
			}

		} else {
			return this.setAttribute($keyName, $id[0][$keyName]);
		}

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

			await $query.getQuery().insert($attributes);
		}

		this.$exists = true;

		this[kWasRecentlyCreated] = true;

		return true;
	}

	[kPerformRelationQuery]() {
		return Promise.all(this[kLazyQueries].map(fn => fn()))
	}

	setLazyQuery(fn) {
		if (Array.isArray(fn)) {
			return this[kLazyQueries] = this[kLazyQueries].concat(fn)
		}
		return this[kLazyQueries].push(fn)
	}

	whereKey($id) {
		if ($id instanceof Model) {
			$id = $id.getKey();
		}

		if (is_array($id)) {
			if (in_array(this.getModel().getKeyType(), ['int', 'integer'])) {
				this.$query.whereIntegerInRaw(this.getModel().getQualifiedKeyName(), $id);
			} else {
				this.$query.whereIn(this.getModel().getQualifiedKeyName(), $id);
			}

			return this;
		}

		if ($id !== null && this.getModel().getKeyType() === 'string') {
			$id = $id.toString();
		}

		return this.where(this.getModel().getQualifiedKeyName(), '=', $id);
	}

	whereKeyNot($id) {
		if ($id instanceof Model) {
			$id = $id.getKey();
		}

		if (is_array($id)) {
			if (in_array(this.getModel().getKeyType(), ['int', 'integer'])) {
				this.$query.whereIntegerNotInRaw(this.getModel().getQualifiedKeyName(), $id);
			} else {
				this.$query.whereNotIn(this.getModel().getQualifiedKeyName(), $id);
			}

			return this;
		}

		if ($id !== null && this.getModel().getKeyType() === 'string') {
			$id = $id.toString();
		}

		return this.where(this.getModel().getQualifiedKeyName(), '!=', $id);
	}

	destroy(id) {
		let where = {
			[this.$primaryKey]: id
		}
		this.where(where)
		return this.delete();
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
		if (Object.keys(this.getAttributes()).length) {
			if (this.$primaryKey in this.getAttributes()) {
				let where = {
					[this.$primaryKey]: this.getAttribute(this.$primaryKey)
				}
				this.where(where)
				return this.$query.delete();
			}
		} else {
			await this.$query.delete()
		}


		this.$exists = false;
	}

	async firstOrNew($attributes = {}, $values = {}) {
		const $instance = await this.where($attributes).first()
		if (!is_null($instance)) {
			return $instance;
		}

		return this.newModelInstance(Object.assign($attributes, $values));
	}

	async findOrFail($id = [], $columns = ['*']) {
		const $result = await this.find($id, $columns);


		if (is_array($id)) {
			if (!$result || count($result) !== count($id.unique())) {
				throw (new ModelNotFoundException).setModel(
					get_class(this.getModel()), $id.difference($result && $result.modelKeys())
				);
			}

			return $result;
		}

		if (is_null($result)) {
			throw (new ModelNotFoundException).setModel(
				get_class(this.getModel()), [$id]
			);
		}

		return $result;
	}

	async findOrNew($id, $columns = ['*']) {
		const $model = await this.find($id, $columns);
		if (!is_null($model)) {
			return $model;
		}

		return this.newModelInstance();
	}

	async findOr($id, $columns = ['*'], $callback = null) {
		if (typeof $columns == 'function') {
			$callback = $columns;

			$columns = ['*'];
		}
		const $model = await this.find($id, $columns)
		if (!is_null($model)) {
			return $model;
		}

		return $callback();
	}

	async firstOrFail($columns = ['*']) {
		const $model = await this.first($columns);
		if (!is_null($model)) {
			return $model;
		}

		throw (new ModelNotFoundException).setModel(get_class(this.getModel()));
	}

	firstOrCreate(where, create = {}) {
		return this.where(where).first().then(res => {
			if (!res) {
				return this.create({ ...where, ...create })
			}
			return res
		})
	}
	firstOr($columns = ['*'], $callback = null) {
		if (typeof $columns == 'function') {
			$callback = $columns;

			$columns = ['*'];
		}
		const $model = this.first($columns)
		if (!is_null($model)) {
			return $model;
		}

		return $callback();
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

	find($id) {
		if (!this.$primaryKey) {
			throw Error('No primary key defined on model');
		}
		return this.where({
			[this.$primaryKey]: $id
		}).first()

	}
	callScope($scope, $parameters = []) {
		$parameters.unshift(this);

		const $query = this.getQuery();

		// We will keep track of how many wheres are on the query before running the
		// scope so that we can properly group the added scope constraints in the
		// query as their own isolated nested where statement and avoid issues.
		const wheres = $query._statements.filter(s => s.type == 'where');
		const $originalWhereCount = is_null(wheres)
			? 0 : count(wheres);

		const $result = $scope(...$parameters) || this;

		// if (count(wheres) > $originalWhereCount) {
		// this.addNewWheresWithinGroup($query, $originalWhereCount);
		// }

		return $result;
	}
	// addNewWheresWithinGroup($query, $originalWhereCount)
	// {
	//     // Here, we totally remove all of the where clauses since we are going to
	//     // rebuild them as nested queries by slicing the groups of wheres into
	//     // their own sections. This is to prevent any confusing logic order.
	//     const $allWheres = $query._statements.filter(s=>s.type == 'where');

	//     $query.clearWhere() ;

	//     this.groupWhereSliceForScope(
	//         $query, $allWheres.slice( 0, $originalWhereCount)
	//     );

	//     this.groupWhereSliceForScope(
	//         $query, $allWheres.slice($originalWhereCount)
	//     );
	// }
	// groupWhereSliceForScope($query, $whereSlice)
	// {
	//     const $whereBooleans = (new Collection($whereSlice)).pluck('boolean');

	//     // Here we'll check if the given subset of where clauses contains any "or"
	//     // booleans and in this case create a nested where expression. That way
	//     // we don't add any unnecessary nesting thus keeping the query clean.
	//     // if ($whereBooleans.contains('or')) {
	//         $query.wheres = this.createNestedWhere(
	//             $whereSlice, $whereBooleans.first()
	//         );
	//     // } else {
	//         $query.wheres = array_merge($query.wheres, $whereSlice);
	//     // }
	// }

	withoutGlobalScopes($scopes = null) {
		if (!is_array($scopes)) {
			$scopes = Object.keys(this.scopes);
		}

		for (const $scope of $scopes) {
			this.withoutGlobalScope($scope);
		}

		return this;
	}
	withGlobalScope($identifier, $scope) {
		this.scopes[$identifier] = $scope;

		if (method_exists($scope, 'extend')) {
			$scope.extend(this);
		}

		return this;
	}

	withoutGlobalScope($scope) {
		if (!is_string($scope)) {
			$scope = get_class($scope);
		}
		delete this[kScopes][$scope];

		this[kRemovedScopes].push($scope);

		return this;
	}
	removedScopes() {
		return this[kRemovedScopes];
	}

	toBase() {
		return this.getQuery();
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
