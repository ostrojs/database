import { implement, is_null, isset, get_class } from '@ostro/support/function';
import HasOneOrMany from './hasOneOrMany';
import SupportsDefaultModels from './concerns/supportsDefaultModels';
import CanBeOneOfMany from './concerns/canBeOneOfMany';
import InteractsWithDictionary from './concerns/interactsWithDictionary';
import Relation from './relation';
import ModelNotFoundException from '../modelNotFoundException';
/**
 * Class HasManyThrough.
 */
class HasManyThrough extends implement(Relation,SupportsDefaultModels, CanBeOneOfMany, InteractsWithDictionary) {
    /**
     * Create a new instance.
     * @param {*} query
     * @param {*} farParent
     * @param {*} throughParent
     * @param {*} firstKey
     * @param {*} secondKey
     * @param {*} localKey
     * @param {*} secondLocalKey
     */
    constructor(query: any, farParent: any, throughParent: any, firstKey: any, secondKey: any, localKey: any, secondLocalKey: any) {
        super(query, throughParent);
        this.$localKey = localKey;
        this.$firstKey = firstKey;
        this.$secondKey = secondKey;
        this.$farParent = farParent;
        this.$throughParent = throughParent;
        this.$secondLocalKey = secondLocalKey;
        this.addConstraints()
    }

    

    /**
     * addConstraints method.
     * @returns {any}
     */
    public addConstraints() {
        const localValue = this.$farParent[this.$localKey];

        this.performJoin();

        if ((this.constructor as any).$constraints) {
            this.$query.where(this.getQualifiedFirstKeyName(), '=', localValue);
        }
    }

    /**
     * performJoin method.
     * @param {*} query
     * @returns {any}
     */
    public performJoin(query: any = null) {
        query = query || this.$query;

        const farKey = this.getQualifiedFarKeyName();

        query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', farKey);

        if (this.throughParentSoftDeletes()) {
            query.withGlobalScope('SoftDeletableHasManyThrough', (query) => {
                query.whereNull(this.$throughParent.getQualifiedDeletedAtColumn());
            });
        }
    }

    /**
     * getQualifiedParentKeyName method.
     * @returns {any}
     */
    public getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$secondLocalKey);
    }

    /**
     * throughParentSoftDeletes method.
     * @returns {any}
     */
    public throughParentSoftDeletes() {
        return this.$throughParent.constructor.name.includes('SoftDeletes') || 
               typeof this.$throughParent.getQualifiedDeletedAtColumn === 'function';
    }

    /**
     * withTrashedParents method.
     * @returns {any}
     */
    public withTrashedParents() {
        this.$query.withoutGlobalScope('SoftDeletableHasManyThrough');

        return this;
    }

    /**
     * addEagerConstraints method.
     * @param {*} models
     * @returns {any}
     */
    public addEagerConstraints(models: any) {
        const whereIn = this.whereInMethod(this.$farParent, this.$localKey);

        this.whereInEager(
            whereIn,
            this.getQualifiedFirstKeyName(),
            this.getKeys(models, this.$localKey)
        );
    }

    /**
     * initRelation method.
     * @param {*} models
     * @param {*} relation
     * @returns {any}
     */
    public initRelation(models: any, relation: any) {
        models.forEach(model => {
            model.setRelation(relation, this.$related.newCollection());
        });

        return models;
    }

    /**
     * match method.
     * @param {*} models
     * @param {*} results
     * @param {*} relation
     * @returns {any}
     */
    public match(models: any, results: any, relation: any) {
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

    /**
     * buildDictionary method.
     * @param {*} results
     * @returns {any}
     */
    public buildDictionary(results: any) {
        const dictionary = {};

        results.forEach(result => {
            if (!dictionary[result.getAttribute("ostro_through_key")]) {
                dictionary[result.getAttribute("ostro_through_key")] = [];
            }
            dictionary[result.getAttribute("ostro_through_key")].push(result);
        });

        return dictionary;
    }

    /**
     * firstOrNew method.
     * @async
     * @param {*} attributes
     * @param {*} values
     * @returns {any}
     */
    public async firstOrNew(attributes: Record<string, any> = {}, values: Record<string, any> = {}) {
        const instance = await this.where(attributes).first();
        if (instance !== null) {
            return instance;
        }

        const model = this.$related.newInstance();
        model.fill({...attributes, ...values});
        return model;
    }

    /**
     * firstOrCreate method.
     * @async
     * @param {*} attributes
     * @param {*} values
     * @returns {any}
     */
    public async firstOrCreate(attributes: Record<string, any> = {}, values: Record<string, any> = {}) {
        const instance = await this.where(attributes).first();
        if (instance !== null) {
            return instance;
        }

        return this.createOrFirst({...attributes, ...values});
    }

    /**
     * createOrFirst method.
     * @async
     * @param {*} attributes
     * @param {*} values
     * @returns {any}
     */
    public async createOrFirst(attributes: Record<string, any> = {}, values: Record<string, any> = {}) {
        try {
            return await this.getQuery().withSavepointIfNeeded(() => {
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

    /**
     * updateOrCreate method.
     * @async
     * @param {*} attributes
     * @param {*} values
     * @returns {any}
     */
    public async updateOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}) {
        const instance = await this.firstOrCreate(attributes, values);

        if (!instance.wasRecentlyCreated) {
            await instance.fill(values).save();
        }
        
        return instance;
    }

    /**
     * firstWhere method.
     * @param {*} column
     * @param {*} operator
     * @param {*} value
     * @param {*} boolean
     * @returns {any}
     */
    public firstWhere(column: string, operator: any = null, value: any = null, boolean: string = 'and') {
        return this.where(column, operator, value, boolean).first();
    }

    /**
     * first method.
     * @async
     * @param {*} columns
     * @returns {any}
     */
    public async first(columns: any[] = ['*']) {
        const results = await this.take(1).get(columns);

        return results.length > 0 ? results.first() : null;
    }

    /**
     * firstOrFail method.
     * @async
     * @param {*} columns
     * @returns {any}
     */
    public async firstOrFail(columns: any[] = ['*']) {
        const model = await this.first(columns);
        if (model !== null) {
            return model;
        }

        throw new ModelNotFoundException().setModel(get_class(this.$related));
    }

    /**
     * firstOr method.
     * @async
     * @param {*} columns
     * @param {*} callback
     * @returns {any}
     */
    public async firstOr(columns: any[] = ['*'], callback: any = null) {
        if (typeof columns === 'function') {
            callback = columns;
            columns = ['*'];
        }

        const model = await this.first(columns);
        if (model !== null) {
            return model;
        }

        return callback();
    }

    /**
     * find method.
     * @async
     * @param {*} id
     * @param {*} columns
     * @returns {any}
     */
    public async find(id: any, columns: any[] = ['*']) {
        if (Array.isArray(id) || (id && typeof id.toArray === 'function')) {
            return this.findMany(id, columns);
        }

        return this.where(
            this.$related.qualifyColumn(this.$related.getKeyName()), '=', id
        ).first(columns);
    }

    /**
     * findMany method.
     * @async
     * @param {*} ids
     * @param {*} columns
     * @returns {any}
     */
    public async findMany(ids: any, columns: any[] = ['*']) {
        ids = (ids && typeof ids.toArray === 'function') ? ids.toArray() : ids;

        if (!ids || ids.length === 0) {
            return this.$related.newCollection();
        }

        return this.whereIn(
            this.$related.qualifyColumn(this.$related.getKeyName()), ids
        ).get(columns);
    }

    /**
     * findOrFail method.
     * @async
     * @param {*} id
     * @param {*} columns
     * @returns {any}
     */
    public async findOrFail(id: any, columns: any[] = ['*']) {
        const result = await this.find(id, columns);

        id = (id && typeof id.toArray === 'function') ? id.toArray() : id;

        if (Array.isArray(id)) {
            const resultCount = result && typeof result.count === 'function' ? result.count() : (result ? result.length : 0);
            if (resultCount === new Set(id).size) {
                return result;
            }
        } else if (result !== null) {
            return result;
        }

        throw new ModelNotFoundException().setModel(get_class(this.$related), id);
    }

    /**
     * findOr method.
     * @async
     * @param {*} id
     * @param {*} columns
     * @param {*} callback
     * @returns {any}
     */
    public async findOr(id: any, columns: any[] = ['*'], callback: any = null) {
        if (typeof columns === 'function') {
            callback = columns;
            columns = ['*'];
        }

        const result = await this.find(id, columns);

        id = (id && typeof id.toArray === 'function') ? id.toArray() : id;

        if (Array.isArray(id)) {
            const resultCount = result && typeof result.count === 'function' ? result.count() : (result ? result.length : 0);
            if (resultCount === new Set(id).size) {
                return result;
            }
        } else if (result !== null) {
            return result;
        }

        return callback();
    }

    /**
     * getResults method.
     * @returns {any}
     */
    public getResults() {
        return this.$farParent[this.$localKey] !== null
                ? this.get()
                : this.$related.newCollection();
    }

    /**
     * get method.
     * @async
     * @param {*} columns
     * @returns {any}
     */
    public async get(columns: any[] = ['*']) {
        const builder = this.prepareQueryBuilder(columns);

        let models = await builder.getModels();

        if (models.length > 0) {
            models = await builder.eagerLoadRelations(models);
        }

        return this.$related.newCollection(models);
    }

    /**
     * paginate method.
     * @param {*} perPage
     * @param {*} columns
     * @param {*} pageName
     * @param {*} page
     * @returns {any}
     */
    public paginate(perPage: any = null, columns: any[] = ['*'], pageName: string = 'page', page: any = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.paginate(perPage, columns, pageName, page);
    }

    /**
     * simplePaginate method.
     * @param {*} perPage
     * @param {*} columns
     * @param {*} pageName
     * @param {*} page
     * @returns {any}
     */
    public simplePaginate(perPage: any = null, columns: any[] = ['*'], pageName: string = 'page', page: any = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.simplePaginate(perPage, columns, pageName, page);
    }

    /**
     * cursorPaginate method.
     * @param {*} perPage
     * @param {*} columns
     * @param {*} cursorName
     * @param {*} cursor
     * @returns {any}
     */
    public cursorPaginate(perPage: any = null, columns: any[] = ['*'], cursorName: string = 'cursor', cursor: any = null) {
        this.$query.addSelect(this.shouldSelect(columns));

        return this.$query.cursorPaginate(perPage, columns, cursorName, cursor);
    }

    /**
     * shouldSelect method.
     * @param {*} columns
     * @returns {any}
     */
    public shouldSelect(columns: any[] = ['*']) {
        if (columns.includes('*') && columns.length == 1) {
            columns = [this.$related.getTable()+'.*'];
        }

        return [...columns, `${this.getQualifiedFirstKeyName()} as ostro_through_key`];
    }

    /**
     * chunk method.
     * @param {*} count
     * @param {*} callback
     * @returns {any}
     */
    public chunk(count: number, callback: Function) {
        return this.prepareQueryBuilder().chunk(count, callback);
    }

    /**
     * chunkById method.
     * @param {*} count
     * @param {*} callback
     * @param {*} column
     * @param {*} alias
     * @returns {any}
     */
    public chunkById(count: number, callback: Function, column: any = null, alias: any = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().chunkById(count, callback, column, alias);
    }

    /**
     * chunkByIdDesc method.
     * @param {*} count
     * @param {*} callback
     * @param {*} column
     * @param {*} alias
     * @returns {any}
     */
    public chunkByIdDesc(count: number, callback: Function, column: any = null, alias: any = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().chunkByIdDesc(count, callback, column, alias);
    }

    /**
     * eachById method.
     * @param {*} callback
     * @param {*} count
     * @param {*} column
     * @param {*} alias
     * @returns {any}
     */
    public eachById(callback: Function, count: number = 1000, column: any = null, alias: any = null) {
        column = column ?? this.getRelated().getQualifiedKeyName();

        alias = alias ?? this.getRelated().getKeyName();

        return this.prepareQueryBuilder().eachById(callback, count, column, alias);
    }

    /**
     * cursor method.
     * @returns {any}
     */
    public cursor() {
        return this.prepareQueryBuilder().cursor();
    }

    /**
     * each method.
     * @param {*} callback
     * @param {*} count
     * @returns {any}
     */
    public each(callback: Function, count: number = 1000) {
        return this.chunk(count, (results) => {
            for (const [key, value] of results.entries()) {
                if (callback(value, key) === false) {
                    return false;
                }
            }
        });
    }

    /**
     * lazy method.
     * @param {*} chunkSize
     * @returns {any}
     */
    public lazy(chunkSize: number = 1000) {
        return this.prepareQueryBuilder().lazy(chunkSize);
    }

    /**
     * lazyById method.
     * @param {*} chunkSize
     * @param {*} column
     * @param {*} alias
     * @returns {any}
     */
    public lazyById(chunkSize: number = 1000, column: any = null, alias: any = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().lazyById(chunkSize, column, alias);
    }

    /**
     * lazyByIdDesc method.
     * @param {*} chunkSize
     * @param {*} column
     * @param {*} alias
     * @returns {any}
     */
    public lazyByIdDesc(chunkSize: number = 1000, column: any = null, alias: any = null) {
        column ??= this.getRelated().getQualifiedKeyName();

        alias ??= this.getRelated().getKeyName();

        return this.prepareQueryBuilder().lazyByIdDesc(chunkSize, column, alias);
    }

    /**
     * prepareQueryBuilder method.
     * @param {*} columns
     * @returns {any}
     */
    public prepareQueryBuilder(columns: any[] = ['*']) {
        return this.$query.select(this.shouldSelect(columns));
    }

    /**
     * getRelationExistenceQuery method.
     * @param {*} query
     * @param {*} parentQuery
     * @param {*} columns
     * @returns {any}
     */
    public getRelationExistenceQuery(query: any, parentQuery: any, columns: any[] = ['*']) {
        if (parentQuery.getTable() === query.getTable()) {
            return this.getRelationExistenceQueryForSelfRelation(query, parentQuery, columns);
        }

        if (parentQuery.getTable() === this.$throughParent.getTable()) {
            return this.getRelationExistenceQueryForThroughSelfRelation(query, parentQuery, columns);
        }

        this.performJoin(query);

        return query.select(columns).whereColumn(
            this.getQualifiedLocalKeyName(), '=', this.getQualifiedFirstKeyName()
        );
    }

    /**
     * getRelationExistenceQueryForSelfRelation method.
     * @param {*} query
     * @param {*} parentQuery
     * @param {*} columns
     * @returns {any}
     */
    public getRelationExistenceQueryForSelfRelation(query: any, parentQuery: any, columns: any[] = ['*']) {
        const hash = this.getRelationCountHash();
        query.from(`${query.getModel().getTable()} as ${hash}`);

        query.join(this.$throughParent.getTable(), this.getQualifiedParentKeyName(), '=', `${hash}.${this.$secondKey}`);

        if (this.throughParentSoftDeletes()) {
            query.whereNull(this.$throughParent.getQualifiedDeletedAtColumn());
        }

        query.getModel().setTable(hash);

        return query.select(columns).whereColumn(
            `${parentQuery.getQuery().from}.${this.$localKey}`, '=', this.getQualifiedFirstKeyName()
        );
    }

    /**
     * getRelationExistenceQueryForThroughSelfRelation method.
     * @param {*} query
     * @param {*} parentQuery
     * @param {*} columns
     * @returns {any}
     */
    public getRelationExistenceQueryForThroughSelfRelation(query: any, parentQuery: any, columns: any[] = ['*']) {
        const hash = this.getRelationCountHash();
        const table = `${this.$throughParent.getTable()} as ${hash}`;

        query.join(table, `${hash}.${this.$secondLocalKey}`, '=', this.getQualifiedFarKeyName());

        if (this.throughParentSoftDeletes()) {
            query.whereNull(`${hash}.${this.$throughParent.getDeletedAtColumn()}`);
        }

        return query.select(columns).whereColumn(
            `${parentQuery.getQuery().from}.${this.$localKey}`, '=', `${hash}.${this.$firstKey}`
        );
    }

    /**
     * getQualifiedFarKeyName method.
     * @returns {any}
     */
    public getQualifiedFarKeyName() {
        return this.getQualifiedForeignKeyName();
    }

    /**
     * getFirstKeyName method.
     * @returns {any}
     */
    public getFirstKeyName() {
        return this.$firstKey;
    }

    /**
     * getQualifiedFirstKeyName method.
     * @returns {any}
     */
    public getQualifiedFirstKeyName() {
        return this.$throughParent.qualifyColumn(this.$firstKey);
    }

    /**
     * getForeignKeyName method.
     * @returns {any}
     */
    public getForeignKeyName() {
        return this.$secondKey;
    }

    /**
     * getQualifiedForeignKeyName method.
     * @returns {any}
     */
    public getQualifiedForeignKeyName() {
        return this.$related.qualifyColumn(this.$secondKey);
    }

    /**
     * getLocalKeyName method.
     * @returns {any}
     */
    public getLocalKeyName() {
        return this.$localKey;
    }

    /**
     * getQualifiedLocalKeyName method.
     * @returns {any}
     */
    public getQualifiedLocalKeyName() {
        return this.$farParent.qualifyColumn(this.$localKey);
    }

    /**
     * getSecondLocalKeyName method.
     * @returns {any}
     */
    public getSecondLocalKeyName() {
        return this.$secondLocalKey;
    }
}

export default HasManyThrough;
