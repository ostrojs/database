import { Macroable } from '@ostro/support/macro';
import Query from '../query/builder';
import MethodNotAvailable from '@ostro/support/exceptions/methodNotAvailable';
import DateTime from '@ostro/support/dateTime';
import GuardsAttributes from './concern/guardsAttributes';
import HasRelationships from './concern/hasRelationships';
import HidesAttributes from './concern/hidesAttributes';
import QueriesRelationships from './concern/queriesRelationships';
import HasAttributes from './concern/hasAttributes';
import HasTimestamps from './concern/hasTimestamps';
import BelongsToMany from './relations/belongsToMany';
import Relation from './relations/relation';
import RelationNotFoundException from './relationNotFoundException';
import ModelNotFoundException from './modelNotFoundException';
const kResolver = Symbol('resolver')
const kQuery = Symbol('query')
const kEagerLoad = Symbol('eagerLoad')
const kModel = Symbol('model')
const kScopes = Symbol('scopes')
const kRemovedScopes = Symbol('removeScopes')
const kWasRecentlyCreated = Symbol('wasRecentlyCreated')
const kPerformRelationQuery = Symbol('performRelationQuery')
const kLazyQueries = Symbol.for('lazyQueries')
import Collection from './collection';
import ModelInterface from '@ostro/contracts/database/eloquent/model';
import { is_array, count, in_array, clone, isset, is_null, empty, implement, get_class, get_class_name, is_string, is_numeric } from '@ostro/support/function';
import { snake, plural, studly, contains, startsWith } from '@ostro/support/string';
import { intersection } from 'lodash';

/**
 * Class Model.
 */
class Model extends implement(ModelInterface, Query, GuardsAttributes, QueriesRelationships, HasRelationships, HasAttributes, HidesAttributes, HasTimestamps) {

	$table = plural(snake(this.constructor.name));

	get $query(): any {
		return (this as any)[kQuery] = (this as any)[kQuery] || Model.getConnectionResolver().table(this.$table)
	}
	set $query($value: any) {
		(this as any)[kQuery] = $value;
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


	/**
	 * Create a new instance.
	 * @param {*} $attributes
	 * @param {*} newInstance
	 */
	constructor($attributes = {}, newInstance = true) {
		super()
		Object.defineProperty(this, kQuery, { value: null, writable: true });
		const instance = newInstance == true ? this.newInstance($attributes, this.$exists, false) : this;
		if (instance.$fillable.length) {
			instance.fill($attributes);
		}

		return instance
	}

	/**
	 * raw method.
	 * @returns {any}
	 */
	raw() {
		return Model.getConnectionResolver().raw(...arguments)
	}

	/**
	 * getConnection method.
	 * @returns {any}
	 */
	getConnection() {

		return get_class(this).resolveConnection(this.getConnectionName());
	}

	/**
	 * getConnectionName method.
	 * @returns {any}
	 */
	getConnectionName() {
		return this.$connection;
	}

	/**
	 * setConnection method.
	 * @param {*} $name
	 * @returns {any}
	 */
	setConnection($name) {

		this.$connection = $name;

		return this;
	}

	/**
	 * resolveConnection method.
	 * @static
	 * @param {*} $connection
	 * @returns {any}
	 */
	static resolveConnection($connection = null) {
		return this[kResolver].connection($connection);
	}

	/**
	 * getConnectionResolver method.
	 * @static
	 * @returns {any}
	 */
	static getConnectionResolver() {
		return this[kResolver];
	}

	/**
	 * setConnectionResolver method.
	 * @static
	 * @param {*} $resolver
	 * @returns {any}
	 */
	static setConnectionResolver($resolver) {
		this[kResolver] = $resolver;
	}

	/**
	 * unsetConnectionResolver method.
	 * @static
	 * @returns {any}
	 */
	static unsetConnectionResolver() {
		this[kResolver] = null;
	}

	/**
	 * fillable method.
	 * @param {*} obj
	 * @returns {any}
	 */
	fillable(obj = {}) {
		let fillKeys = Object.keys(obj)
		let $massAssign = intersection(this.$fillable, fillKeys)
		if ($massAssign.length == 0 && fillKeys.length) {
			throw Error('Add column to fillable property to allow mass assignment on [' + this.constructor.name + '].')
		}
		for (let fillable of $massAssign) {
			if (obj.hasOwnProperty(fillable)) {
				let fn = this['set' + studly(fillable) + 'Attribute']
				if (typeof fn == 'function') {
					this['set' + studly(fillable) + 'Attribute'](obj[fillable])
				} else {
					this.setAttribute(fillable, obj[fillable])
				}
			}

		}

	}

	/**
	 * fill method.
	 * @param {*} $attributes
	 * @returns {any}
	 */
	fill($attributes = {}) {
		let $totallyGuarded = this.totallyGuarded();
		let $fillableAttributes = this.fillableFromArray($attributes)
		for (let $key of $fillableAttributes) {
			let $value = $attributes[$key]
			if (this.isFillable($key)) {
				this.setAttribute($key, $value);
			} else if ($totallyGuarded) {
				throw new Error(
					`Add [${$key}] to fillable property to allow mass assignment on [${this.constructor.name}].`
				);
			}
		}

		return this;
	}

	/**
	 * addTimestampsToInsertValues method.
	 * @param {*} datas
	 * @returns {any}
	 */
	addTimestampsToInsertValues(datas) {
		if (this.$timestamps == true) {
			let datetime = DateTime.now().format(this.$dateFormat);
			datas = !Array.isArray(datas) ? [datas] : datas;
			for (var i = 0; i < datas.length; i++) {
				datas[i][this.CREATED_AT] = datetime
				datas[i][this.UPDATED_AT] = datetime
			}
		}

	}

	/**
	 * updateInserdtId method.
	 * @param {*} $datas
	 * @param {*} $ids
	 * @returns {any}
	 */
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

	/**
	 * getTable method.
	 * @returns {any}
	 */
	getTable() {
		return this.$table;
	}

	/**
	 * setTable method.
	 * @param {*} $table
	 * @returns {any}
	 */
	setTable($table) {
		this.$table = $table;
		return this;
	}

	/**
	 * getKeyName method.
	 * @returns {any}
	 */
	getKeyName() {
		return this.$primaryKey;
	}

	/**
	 * setKeyName method.
	 * @param {*} $key
	 * @returns {any}
	 */
	setKeyName($key) {
		this.$primaryKey = $key;

		return this;
	}

	/**
	 * getKeyType method.
	 * @returns {any}
	 */
	getKeyType() {
		return this.$keyType;
	}

	/**
	 * setKeyType method.
	 * @param {*} $type
	 * @returns {any}
	 */
	setKeyType($type) {
		this.$keyType = $type;

		return this;
	}

	/**
	 * getKey method.
	 * @returns {any}
	 */
	getKey() {
		return this.getAttribute(this.getKeyName());
	}

	/**
	 * getQualifiedKeyName method.
	 * @returns {any}
	 */
	getQualifiedKeyName() {
		return this.qualifyColumn(this.getKeyName());
	}



	/**
	 * first method.
	 * @param {*} $columns
	 * @returns {any}
	 */
	first($columns?: any) {
		this.$query.limit(1)
		// if (this.$attributes && Object.keys(this.$attributes).length) {
		// 	this.where(this.$attributes)
		// }
		return this.get().then(res => {
			if (res.length) {
				return res[0]
			}
			return null
		})

	}

	/**
	 * forceFill method.
	 * @param {*} $attributes
	 * @returns {any}
	 */
	forceFill($attributes: any) {
		return (this.constructor as any).unguarded(() => {
			return this.fill($attributes);
		});
	}

	/**
	 * addWhereExistsQuery method.
	 * @param {*} $query
	 * @param {*} $boolean
	 * @param {*} $not
	 * @returns {any}
	 */
	addWhereExistsQuery($query, $boolean = 'and', $not = false) {
		let raw = $query && typeof $query.getQueryBuilder == 'function' ? $query.getQueryBuilder() : ($query && $query.$query ? $query.$query : $query);
		if ($boolean === 'or') {
			$not ? this.orWhereNotExists(raw) : this.orWhereExists(raw);
		} else {
			$not ? this.whereNotExists(raw) : this.whereExists(raw);
		}
		return this;
	}
	/**
	 * create method.
	 * @param {*} data
	 * @returns {any}
	 */
	create(data: any = {}) {
		let isArray = Array.isArray(data);
		if (isArray && !data.length) {
			return new Collection([]);
		}
		let items: any[] = isArray ? data : [data];

		let instances = items.map(item => {
			if (typeof item != 'object' || item === null) {
				throw new Error('Only json object allowed');
			}
			let instance = this.newInstance();
			instance.fill(item);
			return instance;
		});

		let insertValues = instances.map(inst => inst.getAttributes());
		this.addTimestampsToInsertValues(insertValues);

		return this.$query.insert(insertValues).then(ids => {
			this.updateInserdtId(insertValues, ids);
			instances.forEach((inst, index) => {
				inst.setRawAttributes(insertValues[index], true);
				inst.$exists = true;
				inst.syncOriginal();
			});
			return isArray ? new Collection(instances) : instances[0];
		});
	}

	/**
	 * upsert method.
	 * @param {*} datas
	 * @param {*} $uniqueBy
	 * @param {*} $update
	 * @returns {any}
	 */
	upsert(datas, $uniqueBy, $update = null) {

		throw Error('Under development')
	}

	/**
	 * insert method.
	 * @async
	 * @param {*} $values
	 * @param {*} $ids
	 * @returns {any}
	 */
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

	/**
	 * createSelectWithConstraint method.
	 * @param {*} $name
	 * @returns {any}
	 */
	createSelectWithConstraint($name) {
		return [$name.split(':')[0], function ($query) {
			$query.select($name.split(':')[1].split(',').map(function ($column) {
				if (contains($column, '.')) {
					return $column;
				}

				return $query instanceof BelongsToMany ?
					$query.getRelated().getTable() + '.' + $column :
					$column;
			}));
		}];
	}

	/**
	 * parseWithRelations method.
	 * @param {*} $relations
	 * @returns {any}
	 */
	parseWithRelations($relations) {
		let $results = {};
		$relations = Array.isArray($relations) ? { ...$relations } : $relations
		for (let $name in $relations) {
			let $constraints = $relations[$name]

			if (is_numeric($name)) {
				$name = $constraints;

				[$name, $constraints] = typeof $name === 'string' && $name.includes(':') ?
					this.createSelectWithConstraint($name) : [$name, function () { }];
			}

			$results = this.addNestedWiths($name, $results);
			$results[$name] = $constraints;
		}

		return $results;
	}

	/**
	 * addNestedWiths method.
	 * @param {*} $name
	 * @param {*} $results
	 * @returns {any}
	 */
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

	/**
	 * with method.
	 * @param {*} $relations
	 * @param {*} $callback
	 * @returns {any}
	 */
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

	/**
	 * defaultKeyName method.
	 * @returns {any}
	 */
	defaultKeyName() {
		return this.getModel().getKeyName();
	}

	/**
	 * getModel method.
	 * @returns {any}
	 */
	getModel() {
		return this[kModel] || this;
	}

	/**
	 * setModel method.
	 * @param {*} $model
	 * @returns {any}
	 */
	setModel($model) {
		this[kModel] = $model;

		this.$query.from($model.getTable());

		return this;
	}

	/**
	 * instanceValues method.
	 * @param {*} $values
	 * @returns {any}
	 */
	instanceValues($values) {
		return $values.map($value => {
			let $instance = this.newInstance()
			return $instance
		})
	}

	/**
	 * newInstance method.
	 * @param {*} attributes
	 * @param {*} $exists
	 * @param {*} newInstance
	 * @returns {any}
	 */
	newInstance(attributes?: any, $exists = false, newInstance = false) {

		let $model = new (this.constructor as any)(attributes, newInstance)
		$model.$exists = $exists;

		$model.setConnection(
			this.getConnectionName()
		);

		$model.setTable(this.getTable());
		return $model
	}

	/**
	 * newModelInstance method.
	 * @param {*} $attributes
	 * @returns {any}
	 */
	newModelInstance($attributes: any = {}) {
		const $instance = this.newInstance();
		if ($attributes && Object.keys($attributes).length) {
			$instance.fill($attributes);
		}
		return $instance.setConnection(
			this.getConnection().getName()
		);
	}

	/**
	 * newModelQuery method.
	 * @returns {any}
	 */
	newModelQuery() {
		return this.newEloquentBuilder(
			this.newBaseQueryBuilder()
		).setModel(this);
	}

	/**
	 * newBaseQueryBuilder method.
	 * @returns {any}
	 */
	newBaseQueryBuilder() {
		return Model.getConnectionResolver().table(this.$table)
	}

	/**
	 * newEloquentBuilder method.
	 * @param {*} $query
	 * @returns {any}
	 */
	newEloquentBuilder($query) {
		const $model = this.newInstance()
		$model.$query = $query
		return $model
	}

	/**
	 * hydrate method.
	 * @param {*} $items
	 * @returns {any}
	 */
	hydrate($items) {

		let $instance = this.newInstance();
		let itemsArr = Array.isArray($items) ? $items : ($items && typeof $items.all === 'function' ? $items.all() : Object.values($items || {}));
		return $instance.newCollection(itemsArr.map(function ($item) {
			return $instance.newFromBuilder($item);
		}));
	}

	/**
	 * newCollection method.
	 * @param {*} $data
	 * @returns {any}
	 */
	newCollection($data) {
		return Collection.collect($data || [])
	}

	/**
	 * getModels method.
	 * @async
	 * @returns {any}
	 */
	async getModels() {
		return this.hydrate(
			await this.$query.get()
		);
	}

	/**
	 * newFromBuilder method.
	 * @param {*} $attributes
	 * @param {*} $connection
	 * @returns {any}
	 */
	newFromBuilder($attributes = {}, $connection = null) {
		let $model = this.newInstance({}, true, false);
		$model.setRawAttributes($attributes, true);
		$model.setConnection($connection || this.getConnectionName());

		return $model;
	}

	/**
	 * newQuery method.
	 * @returns {any}
	 */
	newQuery() {
		return this.newModelQuery();
	}

	/**
	 * newQueryWithoutRelationships method.
	 * @returns {any}
	 */
	newQueryWithoutRelationships() {
		return this.newModelQuery();
	}

	/**
	 * getQuery method.
	 * @returns {any}
	 */
	getQuery() {
		return this.$query
	}

	/**
	 * qualifyColumn method.
	 * @param {*} $column
	 * @returns {any}
	 */
	qualifyColumn($column) {
		if (contains($column, '.')) {
			return $column;
		}

		return this.getTable() + '.' + $column;
	}

	/**
	 * isNestedUnder method.
	 * @param {*} $relation
	 * @param {*} $name
	 * @returns {any}
	 */
	isNestedUnder($relation, $name) {
		return contains($name, '.') && startsWith($name, $relation + '.');
	}

	/**
	 * relationsNestedUnder method.
	 * @param {*} $relation
	 * @returns {any}
	 */
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

	/**
	 * getForeignKey method.
	 * @returns {any}
	 */
	getForeignKey() {
		return snake(get_class_name(this)) + '_' + this.getKeyName();
	}

	/**
	 * getRelation method.
	 * @param {*} $name
	 * @returns {any}
	 */
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

	/**
	 * toJSON method.
	 * @returns {any}
	 */
	toJSON() {
		return this.serialize()
	}

	/**
	 * serialize method.
	 * @returns {any}
	 */
	serialize() {
		return this.toJson()
	}

	/**
	 * eagerLoadRelation method.
	 * @async
	 * @param {*} $models
	 * @param {*} $name
	 * @param {*} $constraints
	 * @returns {any}
	 */
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

	/**
	 * eagerLoadRelations method.
	 * @async
	 * @param {*} $models
	 * @returns {any}
	 */
	async eagerLoadRelations($models) {
		for (let $name in this[kEagerLoad]) {
			let $constraints = this[kEagerLoad][$name]
			if (contains($name, '.') === false) {
				$models = await this.eagerLoadRelation($models, $name, $constraints);
			}
		}
		return $models;
	}

	/**
	 * clone method.
	 * @returns {any}
	 */
	clone() {
		const $model = this.newModelInstance();
		$model.$query.$query = this.getQuery().clone();
		$model.forceFill(clone(this.$attributes));
		return $model;

	}

	/**
	 * withAttributes method.
	 * @param {*} skipColumns
	 * @param {*} withTimestamp
	 * @returns {any}
	 */
	withAttributes(skipColumns = [], withTimestamp = false) {
		const $attributes = this.getAttributes();

		if (typeof skipColumns == "boolean") {
			withTimestamp = skipColumns;
			skipColumns = [];
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

	/**
	 * get method.
	 * @async
	 * @returns {any}
	 */
	async get() {
		let $models = await this.getModels();
		if ($models.length > 0) {
			$models = await this.eagerLoadRelations($models);

		}
		return $models
	}

	/**
	 * save method.
	 * @async
	 * @param {*} $options
	 * @returns {any}
	 */
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

	/**
	 * finishSave method.
	 * @param {*} $options
	 * @returns {any}
	 */
	finishSave($options = {}) {

		if (this.isDirty() && ($options['touch'] || true)) {
			this.touchOwners();
		}

		this.syncOriginal();
	}

	/**
	 * performUpdate method.
	 * @async
	 * @param {*} $query
	 * @returns {any}
	 */
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

	/**
	 * setKeysForSaveQuery method.
	 * @param {*} $query
	 * @returns {any}
	 */
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


	/**
	 * getKeyForSaveQuery method.
	 * @param {*} key
	 * @returns {any}
	 */
	getKeyForSaveQuery(key?: any) {
		return this.getOriginal(key || this.getKeyName()) || this.getKey();
	}

	/**
	 * getIncrementing method.
	 * @returns {any}
	 */
	getIncrementing() {
		return this.$incrementing;
	}

	/**
	 * insertAndSetId method.
	 * @async
	 * @param {*} $query
	 * @param {*} $attributes
	 * @returns {any}
	 */
	async insertAndSetId($query, $attributes) {
		let $keyName = this.getKeyName();
		const $id = await $query.insert([$attributes], $keyName);
		if (Array.isArray($keyName)) {
			for (let key of $keyName) {
				this.setAttribute(key, $id[0][key]);
			}
			return this;
		} else {
			const idVal = Array.isArray($id) && typeof $id[0] === 'object' && $id[0] !== null ? $id[0][$keyName] : (Array.isArray($id) ? $id[0] : $id);
			return this.setAttribute($keyName, idVal);
		}

	}

	/**
	 * performInsert method.
	 * @async
	 * @param {*} $query
	 * @returns {any}
	 */
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

	/**
	 * setLazyQuery method.
	 * @param {*} fn
	 * @returns {any}
	 */
	setLazyQuery(fn) {
		if (Array.isArray(fn)) {
			return this[kLazyQueries] = this[kLazyQueries].concat(fn)
		}
		return this[kLazyQueries].push(fn)
	}

	/**
	 * whereKey method.
	 * @param {*} $id
	 * @returns {any}
	 */
	whereKey($id) {
		if ($id instanceof Model) {
			$id = $id.getKey();
		}

		if (is_array($id)) {
			if (in_array(this.getModel().getKeyType(), ['int', 'integer']) && typeof this.$query.whereIntegerInRaw === 'function') {
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

	/**
	 * whereKeyNot method.
	 * @param {*} $id
	 * @returns {any}
	 */
	whereKeyNot($id) {
		if ($id instanceof Model) {
			$id = $id.getKey();
		}

		if (is_array($id)) {
			if (in_array(this.getModel().getKeyType(), ['int', 'integer']) && typeof this.$query.whereIntegerNotInRaw === 'function') {
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

	/**
	 * destroy method.
	 * @param {*} id
	 * @returns {any}
	 */
	destroy(id) {
		let where = {
			[this.$primaryKey]: id
		}
		this.where(where)
		return this.delete();
	}

	/**
	 * delete method.
	 * @async
	 * @returns {any}
	 */
	async delete() {
		if (is_null(this.getKeyName())) {
			throw new Error('No primary key defined on model.');
		}

		this.touchOwners();

		await this.performDeleteOnModel();

		return true;

	}

	/**
	 * performDeleteOnModel method.
	 * @async
	 * @returns {any}
	 */
	async performDeleteOnModel() {
		if (Object.keys(this.getAttributes()).length) {
			if (this.$primaryKey in this.getAttributes()) {
				let where = {
					[this.$primaryKey]: this.getAttribute(this.$primaryKey)
				}
				this.where(where)
				await this.$query.delete();
			}
		} else {
			await this.$query.delete()
		}

		this.$exists = false;
	}

	/**
	 * firstOrNew method.
	 * @async
	 * @param {*} $attributes
	 * @param {*} $values
	 * @returns {any}
	 */
	async firstOrNew($attributes = {}, $values = {}) {
		const $instance = await this.where($attributes).first()
		if (!is_null($instance)) {
			return $instance;
		}

		return this.newModelInstance(Object.assign($attributes, $values));
	}

	/**
	 * findOrFail method.
	 * @async
	 * @param {*} $id
	 * @param {*} $columns
	 * @returns {any}
	 */
	async findOrFail($id = [], $columns = ['*']) {
		const $result = await this.find($id, $columns);


		if (is_array($id)) {
			if (!$result || count($result) !== count(($id as any).unique())) {
				throw (new ModelNotFoundException).setModel(
					get_class(this.getModel()), ($id as any).difference($result && $result.modelKeys())
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

	/**
	 * findOrNew method.
	 * @async
	 * @param {*} $id
	 * @param {*} $columns
	 * @returns {any}
	 */
	async findOrNew($id, $columns = ['*']) {
		const $model = await this.find($id, $columns);
		if (!is_null($model)) {
			return $model;
		}

		return this.newModelInstance();
	}

	/**
	 * findOr method.
	 * @async
	 * @param {*} $id
	 * @param {*} $columns
	 * @param {*} $callback
	 * @returns {any}
	 */
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

	/**
	 * firstOrFail method.
	 * @async
	 * @param {*} $columns
	 * @returns {any}
	 */
	async firstOrFail($columns = ['*']) {
		const $model = await this.first($columns);
		if (!is_null($model)) {
			return $model;
		}

		throw (new ModelNotFoundException).setModel(get_class(this.getModel()));
	}

	/**
	 * firstOrCreate method.
	 * @param {*} where
	 * @param {*} create
	 * @returns {any}
	 */
	firstOrCreate(where, create = {}) {
		return this.where(where).first().then(res => {
			if (!res) {
				return this.create({ ...where, ...create })
			}
			return res
		})
	}
	/**
	 * firstOr method.
	 * @async
	 * @param {*} $columns
	 * @param {*} $callback
	 * @returns {any}
	 */
	async firstOr($columns = ['*'], $callback = null) {
		if (typeof $columns == 'function') {
			$callback = $columns;

			$columns = ['*'];
		}
		const $model = await this.first($columns)
		if (!is_null($model)) {
			return $model;
		}

		return $callback();
	}

	/**
	 * updateOrCreate method.
	 * @param {*} where
	 * @param {*} update
	 * @returns {any}
	 */
	updateOrCreate(where = {}, update = {}) {
		return this.where(where).first().then(async res => {
			if (res) {
				await res.fill(update).save();
				return res;
			}

			return this.create({ ...where, ...update })
		})
	}

	/**
	 * find method.
	 * @param {*} $id
	 * @param {*} $columns
	 * @returns {any}
	 */
	find($id: any, $columns: any = ['*']) {
		if (!this.$primaryKey) {
			throw Error('No primary key defined on model');
		}
		let q = this.where({
			[this.$primaryKey]: $id
		});
		return q.first($columns);

	}

	/**
	 * withSavepointIfNeeded method.
	 * @param {*} $scope
	 * @returns {any}
	 */
	withSavepointIfNeeded($scope) {
		return $scope()
	}

	/**
	 * callScope method.
	 * @param {*} $scope
	 * @param {*} $parameters
	 * @returns {any}
	 */
	callScope($scope, $parameters = []) {
		$parameters.unshift(this);
		const $query = this.getQuery();
		const statements = ($query && $query._statements) || [];
		const wheres = statements.filter(s => s.type == 'where');
		const $originalWhereCount = count(wheres);

		const $result = typeof $scope === 'function' ? ($scope(...$parameters) || this) : this;
		return $result;
	}


	/**
	 * withoutGlobalScopes method.
	 * @param {*} $scopes
	 * @returns {any}
	 */
	withoutGlobalScopes($scopes = null) {
		if (!is_array($scopes)) {
			$scopes = Object.keys(this[kScopes] || {});
		}

		for (const $scope of $scopes) {
			this.withoutGlobalScope($scope);
		}

		return this;
	}
	/**
	 * withGlobalScope method.
	 * @param {*} $identifier
	 * @param {*} $scope
	 * @returns {any}
	 */
	withGlobalScope($identifier, $scope) {
		if (!this[kScopes]) {
			this[kScopes] = {};
		}
		this[kScopes][$identifier] = $scope;

		if ($scope && typeof $scope.extend === 'function') {
			$scope.extend(this);
		}

		return this;
	}

	/**
	 * withoutGlobalScope method.
	 * @param {*} $scope
	 * @returns {any}
	 */
	withoutGlobalScope($scope) {
		if (!is_string($scope)) {
			$scope = get_class($scope);
		}
		delete this[kScopes][$scope];

		this[kRemovedScopes].push($scope);

		return this;
	}

	/**
	 * removedScopes method.
	 * @returns {any}
	 */
	removedScopes() {
		return this[kRemovedScopes];
	}

	/**
	 * toBase method.
	 * @returns {any}
	 */
	toBase() {
		return this.getQuery();
	}

	/**
	 * toArray method.
	 * @returns {any}
	 */
	toArray() {
		return this.attributesToJson();
	}

	/**
	 * toJson method.
	 * @returns {any}
	 */
	toJson() {
		return this.attributesToJson();
	}

	/**
	 * fresh method.
	 * @async
	 * @param {*} $columns
	 * @returns {any}
	 */
	async fresh($columns = ['*']) {
		if (!this.$exists) {
			return null;
		}
		return (new (this.constructor as any)).where(this.getKeyName(), this.getKey()).first($columns);
	}

	/**
	 * refresh method.
	 * @async
	 * @returns {any}
	 */
	async refresh() {
		if (!this.$exists) {
			return this;
		}
		const fresh = await (new (this.constructor as any)).where(this.getKeyName(), this.getKey()).first();
		if (fresh) {
			this.setRawAttributes(fresh.getAttributes(), true);
		}
		return this;
	}

	/**
	 * __set method.
	 * @param {*} target
	 * @param {*} key
	 * @param {*} value
	 * @returns {any}
	 */
	__set(target, key, value) {
		if (typeof key == 'symbol') {
			return target[key] = value
		}
		return target.setAttribute(key, value)
	}

	/**
	 * __get method.
	 * @param {*} target
	 * @param {*} key
	 * @param {*} receiver
	 * @returns {any}
	 */
	__get(target, key, receiver) {
		const self = receiver || target;
		if (typeof target[key] === 'function') {
			return target[key].bind(self);
		}
		let scopeMethod = 'scope' + studly(key);
		if (typeof target[scopeMethod] === 'function') {
			return (...args) => target[scopeMethod](self, ...args) || self;
		}
		return target.getAttribute(key);
	}

	/**
	 * __call method.
	 * @param {*} target
	 * @param {*} method
	 * @param {*} args
	 * @returns {any}
	 */
	__call(target, method, args) {
		if (typeof target[method] == 'function') {
			return target[method](...args);
		}
		let scopeMethod = 'scope' + studly(method);
		if (typeof target[scopeMethod] == 'function') {
			let res = target[scopeMethod](target, ...args);
			return (typeof res !== 'undefined') ? res : target;
		}
		if (target.$query && typeof target.$query[method] == 'function') {
			return target.$query[method](...args);
		}
		throw new MethodNotAvailable('Method [' + method + '] was not available on [' + target.constructor.name + ']');
	}

	/**
	 * __call method.
	 * @static
	 * @param {*} target
	 * @param {*} method
	 * @param {*} args
	 * @returns {any}
	 */
	static __call(target, method, args) {

		let instance = Macroable(new target())

		if (typeof instance[method] == 'function') {
			return instance[method](...args)
		}

		let scopeMethod = 'scope' + studly(method);
		if (typeof instance[scopeMethod] == 'function') {
			let res = instance[scopeMethod](instance, ...args);
			return (typeof res !== 'undefined') ? res : instance;
		}

		throw new MethodNotAvailable('Method [' + method + '] was not available on [' + instance.constructor.name + ']')
	}

}

export default Macroable(Model);
