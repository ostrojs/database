const HasOneOrMany = require('./hasOneOrMany')
const SupportsDefaultModels = require('./concerns/supportsDefaultModels')
const CanBeOneOfMany = require('./concerns/canBeOneOfMany')
const InteractsWithDictionary = require('./concerns/interactsWithDictionary')
const Relation = require('./relation')
const ModelNotFoundException = require('../modelNotFoundException');
class HasManyThrough extends implement(Relation,SupportsDefaultModels, CanBeOneOfMany, InteractsWithDictionary) {
    constructor(query, farParent, throughParent, firstKey, secondKey, localKey, secondLocalKey) {
        super(query, throughParent);
        this.$localKey = localKey;
        this.$firstKey = firstKey;
        this.$secondKey = secondKey;
        this.$farParent = farParent;
        this.$throughParent = throughParent;
        this.$secondLocalKey = secondLocalKey;
        this.addConstraints()
    }

    

    addConstraints() {
        const localValue = this.$farParent[this.$localKey];

        this.performJoin();

        if (this.constructor.$constraints) {
            this.$query.where(this.getQualifiedFirstKeyName(), '=', localValue);
        }
    }

    performJoin(query = null) {
        query = query || this.$query;

        const farKey = this.getQualifiedFarKeyName();

        query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', farKey);

        if (this.throughParentSoftDeletes()) {
            query.withGlobalScope('SoftDeletableHasManyThrough', (query) => {
                query.whereNull(this.$throughParent.getQualifiedDeletedAtColumn());
            });
        }
    }

    getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$secondLocalKey);
    }

    throughParentSoftDeletes() {
        return this.$throughParent.constructor.name.includes('SoftDeletes') || 
               typeof this.$throughParent.getQualifiedDeletedAtColumn === 'function';
    }

    withTrashedParents() {
        this.$query.withoutGlobalScope('SoftDeletableHasManyThrough');

        return this;
    }

    addEagerConstraints(models) {
        const whereIn = this.whereInMethod(this.$farParent, this.$localKey);

        this.whereInEager(
            whereIn,
            this.getQualifiedFirstKeyName(),
            this.getKeys(models, this.$localKey)
        );
    }

    initRelation(models, relation) {
        models.forEach(model => {
            model.setRelation(relation, this.$related.newCollection());
        });

        return models;
    }

    match(models, results, relation) {
        const dictionary = this.buildDictionary(results);

        models.forEach(model => {
            const key = this.getDictionaryKey(model.getAttribute(this.$localKey));
            if (dictionary[key]) {
                model.setRelation(
                    relation, this.$related.newCollection(dictionary[key])
                );
            }
        });

        return models;
    }

    buildDictionary(results) {
        const dictionary = {};

        results.forEach(result => {
            if (!dictionary[result.getAttribute("ostro_through_key")]) {
                dictionary[result.getAttribute("ostro_through_key")] = [];
            }
            dictionary[result.getAttribute("ostro_through_key")].push(result);
        });

        return dictionary;
    }

    async firstOrNew(attributes = {}, values = {}) {
        const instance = await this.where(attributes).first();
        if (instance !== null) {
            return instance;
        }

        return this.$related.newInstance({...attributes, ...values});
    }

    async firstOrCreate(attributes = {}, values = {}) {
        const instance = await this.clone().where(attributes).first();
        if (instance !== null) {
            return instance;
        }

        return this.createOrFirst({...attributes, ...values});
    }

    async createOrFirst(attributes = {}, values = {}) {
        try {
            return this.getQuery().withSavepointIfNeeded(function () {
                return this.create({...attributes, ...values});
            });
        } catch (exception) {
            if (exception.name === 'UniqueConstraintViolationException') {
                const result = await this.where(attributes).first();
                if (result) return result;
            }
            throw exception;
        }
    }

    async updateOrCreate(attributes, values = {}) {
        const instance = await this.firstOrCreate(attributes, values);

        if (!instance.wasRecentlyCreated) {
            await instance.fill(values).save();
        }
        
        return instance;
    }

    firstWhere(column, operator = null, value = null, boolean = 'and') {
        return this.where(column, operator, value, boolean).first();
    }

    async first(columns = ['*']) {
        const results = await this.take(1).get(columns);

        return results.length > 0 ? results.first() : null;
    }

    async firstOrFail(columns = ['*']) {
        const model = await this.first(columns);
        if (model !== null) {
            return model;
        }

        const ModelNotFoundException = require('../exceptions/ModelNotFoundException');
        throw new ModelNotFoundException().setModel(this.$related.constructor.name);
    }

    firstOr(columns = ['*'], callback = null) {
        if (typeof columns === 'function') {
            callback = columns;
            columns = ['*'];
        }

        const model = this.first(columns);
        if (model !== null) {
            return model;
        }

        return callback();
    }

    find(id, columns = ['*']) {
        if (Array.isArray(id) || (id && typeof id.toArray === 'function')) {
            return this.findMany(id, columns);
        }

        return this.where(
            this.getRelated().getQualifiedKeyName(), '=', id
        ).first(columns);
    }

    findMany(ids, columns = ['*']) {
        ids = (ids && typeof ids.toArray === 'function') ? ids.toArray() : ids;

        if (!ids || ids.length === 0) {
            return this.getRelated().newCollection();
        }

        return this.whereIn(
            this.getRelated().getQualifiedKeyName(), ids
        ).get(columns);
    }

    findOrFail(id, columns = ['*']) {
        const result = this.find(id, columns);

        id = (id && typeof id.toArray === 'function') ? id.toArray() : id;

        if (Array.isArray(id)) {
            if (result.length === new Set(id).size) {
                return result;
            }
        } else if (result !== null) {
            return result;
        }

        throw new ModelNotFoundException().setModel(this.$related.constructor.name, id);
    }

    findOr(id, columns = ['*'], callback = null) {
        if (typeof columns === 'function') {
            callback = columns;
            columns = ['*'];
        }

        const result = this.find(id, columns);

        id = (id && typeof id.toArray === 'function') ? id.toArray() : id;

        if (Array.isArray(id)) {
            if (result.length === new Set(id).size) {
                return result;
            }
        } else if (result !== null) {
            return result;
        }

        return callback();
    }

    getResults() {
        return this.$farParent[this.$localKey] !== null
                ? this.get()
                : this.$related.newCollection();
    }

    async get(columns = ['*']) {
        const builder = this.prepareQueryBuilder(columns);

        let models = await builder.getModels();

        if (models.length > 0) {
            models = await builder.eagerLoadRelations(models);
        }

        return this.$related.newCollection(models);
    }

    paginate(perPage = null, columns = ['*'], pageName = 'page', page = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.paginate(perPage, columns, pageName, page);
    }

    simplePaginate(perPage = null, columns = ['*'], pageName = 'page', page = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.simplePaginate(perPage, columns, pageName, page);
    }

    cursorPaginate(perPage = null, columns = ['*'], cursorName = 'cursor', cursor = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.cursorPaginate(perPage, columns, cursorName, cursor);
    }

    shouldSelect(columns = ['*']) {
        if (columns.includes('*') && columns.length == 1) {
            columns = [this.$related.getTable()+'.*'];
        }

        return [...columns, `${this.getQualifiedFirstKeyName()} as ostro_through_key`];
    }

    chunk(count, callback) {
        return this.prepareQueryBuilder().chunk(count, callback);
    }

    chunkById(count, callback, column = null, alias = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().chunkById(count, callback, column, alias);
    }

    chunkByIdDesc(count, callback, column = null, alias = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().chunkByIdDesc(count, callback, column, alias);
    }

    eachById(callback, count = 1000, column = null, alias = null) {
        column = column ?? this.getRelated().getQualifiedKeyName();

        alias = alias ?? this.getRelated().getKeyName();

        return this.prepareQueryBuilder().eachById(callback, count, column, alias);
    }

    cursor() {
        return this.prepareQueryBuilder().cursor();
    }

    each(callback, count = 1000) {
        return this.chunk(count, (results) => {
            results.forEach((value, key) => {
                if (callback(value, key) === false) {
                    return false;
                }
            });
        });
    }

    lazy(chunkSize = 1000) {
        return this.prepareQueryBuilder().lazy(chunkSize);
    }

    lazyById(chunkSize = 1000, column = null, alias = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().lazyById(chunkSize, column, alias);
    }

    lazyByIdDesc(chunkSize = 1000, column = null, alias = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().lazyByIdDesc(chunkSize, column, alias);
    }

    prepareQueryBuilder(columns = ['*']) {
        return this.$query.select(this.shouldSelect(columns));
    }

    getRelationExistenceQuery(query, parentQuery, columns = ['*']) {
        if (parentQuery.getQuery().from === query.getQuery().from) {
            return this.getRelationExistenceQueryForSelfRelation(query, parentQuery, columns);
        }

        if (parentQuery.getQuery().from === this.$throughParent.getTable()) {
            return this.getRelationExistenceQueryForThroughSelfRelation(query, parentQuery, columns);
        }

        this.performJoin(query);

        return query.select(columns).whereColumn(
            this.getQualifiedLocalKeyName(), '=', this.getQualifiedFirstKeyName()
        );
    }

    getRelationExistenceQueryForSelfRelation(query, parentQuery, columns = ['*']) {
        query.from(`${query.getModel().getTable()} as ${hash = this.getRelationCountHash()}`);

        query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', `${hash}.${this.$secondKey}`);

        if (this.throughParentSoftDeletes()) {
            query.whereNull(this.$throughParent.getQualifiedDeletedAtColumn());
        }

        query.getModel().setTable(hash);

        return query.select(columns).whereColumn(
            `${parentQuery.getQuery().from}.${this.$localKey}`, '=', this.getQualifiedFirstKeyName()
        );
    }

    getRelationExistenceQueryForThroughSelfRelation(query, parentQuery, columns = ['*']) {
        const table = `${this.$throughParent.getTable()} as ${hash = this.getRelationCountHash()}`;

        query.join(table, `${hash}.${this.$secondLocalKey}`, '=', this.getQualifiedFarKeyName());

        if (this.throughParentSoftDeletes()) {
            query.whereNull(`${hash}.${this.$throughParent.getDeletedAtColumn()}`);
        }

        return query.select(columns).whereColumn(
            `${parentQuery.getQuery().from}.${this.$localKey}`, '=', `${hash}.${this.$firstKey}`
        );
    }

    getQualifiedFarKeyName() {
        return this.getQualifiedForeignKeyName();
    }

    getFirstKeyName() {
        return this.$firstKey;
    }

    getQualifiedFirstKeyName() {
        return this.$throughParent.qualifyColumn(this.$firstKey);
    }

    getForeignKeyName() {
        return this.$secondKey;
    }

    getQualifiedForeignKeyName() {
        return this.$related.qualifyColumn(this.$secondKey);
    }

    getLocalKeyName() {
        return this.$localKey;
    }

    getQualifiedLocalKeyName() {
        return this.$farParent.qualifyColumn(this.$localKey);
    }

    getSecondLocalKeyName() {
        return this.$secondLocalKey;
    }
}

module.exports = HasManyThrough
