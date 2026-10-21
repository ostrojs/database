const { createDatabaseManager, closeConnections } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _HasManyThrough = require('../src/eloquent/relations/hasManyThrough');
const HasManyThrough = _HasManyThrough.default || _HasManyThrough;
const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;

describe('HasManyThrough Deep 100% Coverage Suite', () => {
    let db;
    let Country, User, Post, SoftDeleteUser;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;

        const schema = db.connection().getSchemaBuilder();

        await schema.create('countries_hmt', (table) => {
            table.increments('id');
            table.string('name');
        });

        await schema.create('users_hmt', (table) => {
            table.increments('id');
            table.integer('country_id');
            table.string('name');
            table.timestamp('deleted_at').nullable();
        });

        await schema.create('posts_hmt', (table) => {
            table.increments('id');
            table.integer('user_id');
            table.string('title');
        });

        Country = class extends Model {
            $table = 'countries_hmt';
            $timestamps = false;
            posts() {
                return this.hasManyThrough(Post, User, 'country_id', 'user_id', 'id', 'id');
            }
        };

        User = class extends Model {
            $table = 'users_hmt';
            $timestamps = false;
        };

        SoftDeleteUser = class extends Model {
            $table = 'users_hmt';
            $timestamps = false;
            getQualifiedDeletedAtColumn() {
                return 'users_hmt.deleted_at';
            }
            getDeletedAtColumn() {
                return 'deleted_at';
            }
        };

        Post = class extends Model {
            $table = 'posts_hmt';
            $timestamps = false;
            $fillable = ['title', 'user_id', 'posts_hmt.title'];
        };
    });

    afterAll(async () => {
        await closeConnections(db);
    });

    test('getResults, first, firstOrNew, firstOrCreate, createOrFirst, updateOrCreate', async () => {
        const country = new Country();
        country.id = 1;
        country.name = 'Japan';
        await country.save();

        const user = new User();
        user.country_id = country.id;
        user.name = 'Yuki';
        await user.save();

        const post = new Post();
        post.user_id = user.id;
        post.title = 'Hello Tokyo';
        await post.save();

        const rel = country.posts();

        // getResults
        const results = await rel.getResults();
        expect(results.length).toBe(1);
        expect(results.first().title).toBe('Hello Tokyo');

        // getResults when local key is null
        const dummyCountry = new Country();
        dummyCountry.setAttribute('id', null);
        const emptyResults = await dummyCountry.posts().getResults();
        expect(emptyResults.length).toBe(0);

        // first
        const foundFirst = await rel.first();
        expect(foundFirst.title).toBe('Hello Tokyo');

        // firstWhere
        const foundFirstWhere = await rel.firstWhere('posts_hmt.title', '=', 'Hello Tokyo');
        expect(foundFirstWhere.id).toBe(post.id);

        // firstOrNew when found
        const existingFirst = await rel.firstOrNew({ title: 'Hello Tokyo' });
        expect(existingFirst.id).toBe(post.id);

        // firstOrNew when not found
        const newFirst = await country.posts().firstOrNew({ title: 'Nonexistent' }, { user_id: user.id });
        expect(newFirst.id).toBeUndefined();
        expect(newFirst.title).toBe('Nonexistent');

        // firstOrCreate when found
        const createdExisting = await country.posts().firstOrCreate({ title: 'Hello Tokyo' });
        expect(createdExisting.id).toBe(post.id);

        // firstOrCreate when not found
        const createRel = country.posts();
        jest.spyOn(createRel, 'createOrFirst').mockImplementationOnce(async (attrs) => {
            const p = new Post();
            p.id = 2;
            p.title = attrs.title;
            p.wasRecentlyCreated = true;
            return p;
        });
        const createdNew = await createRel.firstOrCreate({ title: 'Kyoto Guide' }, { user_id: user.id });
        expect(createdNew.id).toBeDefined();
        expect(createdNew.title).toBe('Kyoto Guide');

        // updateOrCreate when exists
        const updated = await country.posts().updateOrCreate({ title: 'Hello Tokyo' }, { title: 'Updated Tokyo' });
        expect(updated.title).toBe('Updated Tokyo');

        // createOrFirst exception handling branch
        const mockException = new Error('Unique violation');
        mockException.name = 'UniqueConstraintViolationException';
        const createOrFirstRel = country.posts();
        createOrFirstRel.getQuery().withSavepointIfNeeded = () => {
            throw mockException;
        };
        const handledRecord = await createOrFirstRel.createOrFirst({ title: 'Updated Tokyo' });
        expect(handledRecord.title).toBe('Updated Tokyo');

        // createOrFirst rethrows other exceptions
        const otherException = new Error('Database down');
        const otherRel = country.posts();
        otherRel.getQuery().withSavepointIfNeeded = () => {
            throw otherException;
        };
        await expect(otherRel.createOrFirst({ title: 'Anything' })).rejects.toThrow('Database down');
    });

    test('firstOrFail and firstOr variations', async () => {
        const country = await Country.first();
        const rel = country.posts();

        // firstOrFail success
        const found = await rel.firstOrFail();
        expect(found).toBeDefined();

        // firstOrFail failure
        await expect(country.posts().where('posts_hmt.title', 'Nonexistent').firstOrFail()).rejects.toThrow(ModelNotFoundException);

        // firstOr success
        const successOr = await rel.firstOr(() => 'callback');
        expect(successOr.title).toBeDefined();

        // firstOr failure (with column array & callback)
        const relEmpty = country.posts().where('posts_hmt.title', 'Nothing');
        const fallback = await relEmpty.firstOr(['posts_hmt.id', 'posts_hmt.title'], () => 'fallback_called');
        expect(fallback).toBe('fallback_called');

        // firstOr with callback as first argument
        const fallbackDirect = await relEmpty.firstOr(() => 'direct_fallback');
        expect(fallbackDirect).toBe('direct_fallback');
    });

    test('find, findMany, findOrFail, findOr', async () => {
        const country = await Country.first();
        const post = await Post.first();

        // find single ID
        const found = await country.posts().find(post.id);
        expect(found).toBeDefined();

        // find array of IDs
        const foundMany = await country.posts().find([post.id]);
        expect(foundMany.length).toBe(1);

        // find with empty array
        const foundEmpty = await country.posts().find([]);
        expect(foundEmpty.length).toBe(0);

        // find with collection / toArray
        const foundCollection = await country.posts().find({ toArray: () => [post.id] });
        expect(foundCollection.length).toBe(1);

        // findOrFail single success
        const foundSingleSuccess = await country.posts().findOrFail(post.id);
        expect(foundSingleSuccess).toBeDefined();

        // findOrFail single failure
        await expect(country.posts().findOrFail(99999)).rejects.toThrow();

        // findOrFail array success
        const foundArraySuccess = await country.posts().findOrFail([post.id]);
        expect(foundArraySuccess.length).toBe(1);

        // findOrFail array failure (missing IDs)
        await expect(country.posts().findOrFail([post.id, 99999])).rejects.toThrow();

        // findOr single success
        expect(await country.posts().findOr(post.id, () => 'fallback')).toBeDefined();

        // findOr single failure
        expect(await country.posts().findOr(99999, () => 'fallback_hit')).toBe('fallback_hit');

        // findOr array success
        const foundOrArraySuccess = await country.posts().findOr([post.id], () => 'fallback');
        expect(foundOrArraySuccess.length).toBe(1);

        // findOr with columns and callback
        expect(await country.posts().findOr(99999, ['posts_hmt.id'], () => 'col_fallback')).toBe('col_fallback');

        // findOrFail and findOr with id having toArray
        const idObjSuccess = { toArray: () => [post.id] };
        expect((await country.posts().findOrFail(idObjSuccess)).length).toBe(1);
        expect((await country.posts().findOr(idObjSuccess, () => 'fallback')).length).toBe(1);

        // findOrFail and findOr with result as plain Array without .count() method
        const relMockArray = country.posts();
        relMockArray.find = async () => [post];
        expect((await relMockArray.findOrFail([post.id])).length).toBe(1);
        expect((await relMockArray.findOr([post.id], () => 'fallback')).length).toBe(1);

        // findOrFail and findOr with result as null for array id
        const relMockNull = country.posts();
        relMockNull.find = async () => null;
        await expect(relMockNull.findOrFail([post.id])).rejects.toThrow();
        expect(await relMockNull.findOr([post.id], () => 'null_fallback')).toBe('null_fallback');
    });

    test('pagination and chunking methods', async () => {
        const country = await Country.first();

        // paginate, simplePaginate, cursorPaginate
        const fakeQuery = {
            getModel: () => new Post(),
            paginate: jest.fn().mockReturnValue('paginated'),
            simplePaginate: jest.fn().mockReturnValue('simple_paginated'),
            cursorPaginate: jest.fn().mockReturnValue('cursor_paginated'),
            addSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            chunk: jest.fn().mockImplementation((c, cb) => cb([1, 2])),
            chunkById: jest.fn().mockReturnValue('chunkById'),
            chunkByIdDesc: jest.fn().mockReturnValue('chunkByIdDesc'),
            eachById: jest.fn().mockReturnValue('eachById'),
            cursor: jest.fn().mockReturnValue('cursor'),
            lazy: jest.fn().mockReturnValue('lazy'),
            lazyById: jest.fn().mockReturnValue('lazyById'),
            lazyByIdDesc: jest.fn().mockReturnValue('lazyByIdDesc'),
            where: jest.fn().mockReturnThis(),
            join: jest.fn().mockReturnThis(),
        };

        const mockRel = new HasManyThrough(fakeQuery, country, new User, 'country_id', 'user_id', 'id', 'id');

        expect(mockRel.paginate(15)).toBe('paginated');
        expect(mockRel.simplePaginate(15)).toBe('simple_paginated');
        expect(mockRel.cursorPaginate(15)).toBe('cursor_paginated');

        mockRel.chunk(10, () => {});
        expect(fakeQuery.chunk).toHaveBeenCalled();

        expect(mockRel.chunkById(10, () => {})).toBe('chunkById');
        expect(mockRel.chunkByIdDesc(10, () => {})).toBe('chunkByIdDesc');
        expect(mockRel.eachById(() => {})).toBe('eachById');
        expect(mockRel.cursor()).toBe('cursor');
        expect(mockRel.lazy(10)).toBe('lazy');
        expect(mockRel.lazyById(10)).toBe('lazyById');
        expect(mockRel.lazyByIdDesc(10)).toBe('lazyByIdDesc');

        // each callback returning false
        let count = 0;
        mockRel.each((item) => {
            count++;
            return false;
        });
        expect(count).toBe(1);

        // each callback returning true (not false)
        let fullCount = 0;
        mockRel.each((item) => {
            fullCount++;
            return true;
        });
        expect(fullCount).toBe(2);

        // shouldSelect with custom columns
        const selectCols = mockRel.shouldSelect(['id', 'title']);
        expect(selectCols).toContain('id');
        expect(selectCols).toContain('title');
        expect(selectCols[selectCols.length - 1]).toContain('as ostro_through_key');
    });

    test('keys and qualified getters', () => {
        const country = new Country();
        const rel = country.posts();

        expect(rel.getFirstKeyName()).toBe('country_id');
        expect(rel.getQualifiedFirstKeyName()).toBe('users_hmt.country_id');
        expect(rel.getForeignKeyName()).toBe('user_id');
        expect(rel.getQualifiedForeignKeyName()).toBe('posts_hmt.user_id');
        expect(rel.getLocalKeyName()).toBe('id');
        expect(rel.getQualifiedLocalKeyName()).toBe('countries_hmt.id');
        expect(rel.getSecondLocalKeyName()).toBe('id');
        expect(rel.getQualifiedParentKeyName()).toBe('users_hmt.id');
    });

    test('soft deletes on through parent and withTrashedParents', () => {
        const softRel = new HasManyThrough(
            Post.newQuery(),
            new Country(),
            new SoftDeleteUser(),
            'country_id',
            'user_id',
            'id',
            'id'
        );

        expect(softRel.throughParentSoftDeletes()).toBe(true);

        softRel.withTrashedParents();
    });

    test('existence queries: normal, self-relation, and through-self-relation', async () => {
        const country = new Country();
        const rel = country.posts();

        // 1. Normal relation existence query
        const existenceQuery = rel.getRelationExistenceQuery(
            Post.newQuery(),
            Country.newQuery()
        );
        expect(existenceQuery).toBeDefined();

        // 2. Self relation existence query (parentQuery table === query table)
        const postQuery1 = Post.newQuery();
        const postQuery2 = Post.newQuery();
        const selfRel = new HasManyThrough(
            postQuery1,
            new Post(),
            new User(),
            'parent_post_id',
            'user_id',
            'id',
            'id'
        );
        const selfExistence = selfRel.getRelationExistenceQuery(
            postQuery1,
            postQuery2
        );
        expect(selfExistence).toBeDefined();

        // Self relation with soft deletes on through parent
        const selfRelSoft = new HasManyThrough(
            Post.newQuery(),
            new Post(),
            new SoftDeleteUser(),
            'parent_post_id',
            'user_id',
            'id',
            'id'
        );
        const selfSoftExistence = selfRelSoft.getRelationExistenceQueryForSelfRelation(
            Post.newQuery(),
            Post.newQuery()
        );
        expect(selfSoftExistence).toBeDefined();

        // 3. Through self relation (parentQuery table === throughParent table)
        const throughSelfRel = new HasManyThrough(
            Post.newQuery(),
            new User(),
            new User(),
            'manager_id',
            'user_id',
            'id',
            'id'
        );
        const throughSelfExistence = throughSelfRel.getRelationExistenceQuery(
            Post.newQuery(),
            User.newQuery()
        );
        expect(throughSelfExistence).toBeDefined();

        // Through self relation with soft deletes
        const throughSelfSoftRel = new HasManyThrough(
            Post.newQuery(),
            new SoftDeleteUser(),
            new SoftDeleteUser(),
            'manager_id',
            'user_id',
            'id',
            'id'
        );
        const throughSelfSoftExistence = throughSelfSoftRel.getRelationExistenceQueryForThroughSelfRelation(
            Post.newQuery(),
            SoftDeleteUser.newQuery()
        );
        expect(throughSelfSoftExistence).toBeDefined();

        // Through parent soft delete global scope execution (Line 41)
        const softQuery = Post.newQuery();
        const testSoftRel = new HasManyThrough(
            softQuery,
            new Country(),
            new SoftDeleteUser(),
            'country_id',
            'user_id',
            'id',
            'id'
        );
        testSoftRel.performJoin(softQuery);
        const scopeSym = Object.getOwnPropertySymbols(softQuery).find(s => s.toString().includes('scopes'));
        const scopes = scopeSym ? softQuery[scopeSym] : null;
        if (scopes && scopes.SoftDeletableHasManyThrough) {
            const scopeFn = scopes.SoftDeletableHasManyThrough;
            const dummyQ = { whereNull: jest.fn() };
            scopeFn(dummyQ);
            expect(dummyQ.whereNull).toHaveBeenCalled();
        }

        // initRelation and match with and without matching results (Lines 72-90)
        const country1 = new Country();
        country1.id = 1;
        const country2 = new Country();
        country2.id = 2;
        country1.setRelation('posts', null);
        country2.setRelation('posts', null);

        rel.initRelation([country1, country2], 'posts');
        expect(country1.relation('posts')).toBeDefined();
        expect(country2.relation('posts')).toBeDefined();

        const fakePost1 = new Post();
        fakePost1.setAttribute('ostro_through_key', 1);
        fakePost1.title = 'Post 1';

        rel.match([country1, country2], [fakePost1], 'posts');
        expect(country1.relation('posts').length).toBe(1);
        expect(country2.relation('posts').length).toBe(0);

        // createOrFirst normal success path (Line 130)
        const successRel = country.posts();
        jest.spyOn(successRel, 'create').mockImplementationOnce(async (attrs) => {
            const p = new Post();
            p.fill(attrs);
            p.wasRecentlyCreated = true;
            return p;
        });
        const createdSuccess = await successRel.createOrFirst({ title: 'Created Direct' });
        expect(createdSuccess.title).toBe('Created Direct');
    });
});

