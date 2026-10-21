'use strict';

const { createDatabaseManager } = require('./setup');

describe('Query Builder Deep Coverage Tests', () => {
    let db;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        const schema = db.connection().getSchemaBuilder();

        await schema.createTable('builder_items', (table) => {
            table.increments('id');
            table.string('title');
            table.integer('score').defaultTo(0);
        });

        await db.table('builder_items').insert([
            { title: 'Item 1', score: 10 },
            { title: 'Item 2', score: 20 },
            { title: 'Item 3', score: 30 }
        ]);
    });

    afterAll(async () => {
        const schema = db.connection().getSchemaBuilder();
        await schema.dropTableIfExists('builder_items');
        db.disconnect();
    });

    test('toSql and toSQL return identical query string', () => {
        const query = db.table('builder_items').where('score', '>', 10);
        expect(query.toSql().sql).toEqual(query.toSQL().sql);
        expect(query.toSql().bindings).toEqual(query.toSQL().bindings);
    });

    test('column() and select() methods chain properly', async () => {
        const query = db.table('builder_items').column('title').select('score');
        expect(query).toBeDefined();
    });

    test('skip() and take() aliases for offset and limit', async () => {
        const items = await db.table('builder_items').orderBy('id').skip(1).take(1).get();
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('Item 2');
    });

    test('as() method alias', () => {
        const sub = db.table('builder_items').where('score', 10).as('sub_items');
        expect(sub).toBeDefined();
    });

    test('queryContext and query proxy methods', () => {
        const query = db.table('builder_items');
        let queryContextCalled = false;
        let queryFnCalled = false;

        const mockInnerBuilder = {
            queryContext: () => { queryContextCalled = true; },
            query: () => { queryFnCalled = true; }
        };
        query.getQueryBuilder = () => mockInnerBuilder;

        query.queryContext({ user: 'admin' });
        expect(queryContextCalled).toBe(true);

        query.query();
        expect(queryFnCalled).toBe(true);
    });

    test('joins, outer joins, cross join and joinRaw methods', () => {
        const q = db.table('builder_items');
        expect(q.innerJoin('other', 'builder_items.id', 'other.item_id')).toBe(q);
        expect(q.leftOuterJoin('other', 'builder_items.id', 'other.item_id')).toBe(q);
        expect(q.rightJoin('other', 'builder_items.id', 'other.item_id')).toBe(q);
        expect(q.rightOuterJoin('other', 'builder_items.id', 'other.item_id')).toBe(q);
        expect(q.fullOuterJoin('other', 'builder_items.id', 'other.item_id')).toBe(q);
        expect(q.crossJoin('other')).toBe(q);
        expect(q.joinRaw('natural join other')).toBe(q);
    });

    test('on clause helper methods', () => {
        const q = db.table('builder_items');
        const mockMethods = ['onIn', 'onNotIn', 'onNull', 'onNotNull', 'onExists', 'onNotExists', 'onBetween', 'onNotBetween'];
        const mock = {};
        mockMethods.forEach(m => { mock[m] = jest.fn(); });
        q.getQueryBuilder = () => mock;

        expect(q.onIn('col', [1, 2])).toBe(q);
        expect(q.onNotIn('col', [1, 2])).toBe(q);
        expect(q.onNull('col')).toBe(q);
        expect(q.onNotNull('col')).toBe(q);
        expect(q.onExists(db.table('builder_items'))).toBe(q);
        expect(q.onNotExists(db.table('builder_items'))).toBe(q);
        expect(q.onBetween('col', [1, 10])).toBe(q);
        expect(q.onNotBetween('col', [1, 10])).toBe(q);
    });

    test('having clause helper methods', () => {
        const q = db.table('builder_items');
        expect(q.having('score', '>', 5)).toBe(q);
        expect(q.havingIn('score', [10, 20])).toBe(q);
        expect(q.havingNotIn('score', [10, 20])).toBe(q);
        expect(q.havingNull('score')).toBe(q);
        expect(q.havingNotNull('score')).toBe(q);
        expect(q.havingExists(db.table('builder_items'))).toBe(q);
        expect(q.havingNotExists(db.table('builder_items'))).toBe(q);
        expect(q.havingBetween('score', [1, 100])).toBe(q);
        expect(q.havingNotBetween('score', [1, 100])).toBe(q);
        expect(q.havingRaw('count(*) > 1')).toBe(q);
    });

    test('clear methods, distinct, groupBy, orderByRaw, union, unionAll', () => {
        const q = db.table('builder_items');
        expect(q.clearSelect()).toBe(q);
        expect(q.clearWhere()).toBe(q);
        expect(q.clearOrder()).toBe(q);
        expect(q.clearHaving()).toBe(q);
        expect(q.clearCounters()).toBe(q);
        expect(q.distinct()).toBe(q);
        expect(q.groupBy('score')).toBe(q);
        expect(q.groupByRaw('score DESC')).toBe(q);
        expect(q.orderByRaw('score ASC')).toBe(q);
        expect(q.union(db.table('builder_items'))).toBe(q);
        expect(q.unionAll(db.table('builder_items'))).toBe(q);
    });

    test('whereColumn, wrap, orWhereNot, orWhereBetween, orWhereNotBetween', () => {
        const q = db.table('builder_items');
        expect(q.whereColumn('title', '=', 'title')).toBe(q);
        const mock = { wrap: jest.fn() };
        q.getQueryBuilder = () => mock;
        expect(q.wrap('title')).toBe(q);
        expect(mock.wrap).toHaveBeenCalledWith('title');

        const q2 = db.table('builder_items');
        expect(q2.orWhereNot('score', 10)).toBe(q2);
        expect(q2.orWhereBetween('score', [5, 15])).toBe(q2);
        expect(q2.orWhereNotBetween('score', [5, 15])).toBe(q2);
    });

    test('whereExists and whereNotExists with Builder and plain Knex instances', () => {
        const q = db.table('builder_items');
        const sub1 = db.table('builder_items');
        const sub2 = { $query: db.table('builder_items').getQuery() };
        const sub3 = 'SELECT 1';
        expect(q.whereExists(sub1)).toBe(q);
        expect(q.whereExists(sub2)).toBe(q);
        expect(q.whereExists(sub3)).toBe(q);
        expect(q.whereNotExists(sub1)).toBe(q);
        expect(q.whereNotExists(sub2)).toBe(q);
        expect(q.whereNotExists(sub3)).toBe(q);
        expect(q.orWhereExists(sub1)).toBe(q);
        expect(q.orWhereExists(sub2)).toBe(q);
        expect(q.orWhereExists(sub3)).toBe(q);
        expect(q.orWhereNotExists(sub1)).toBe(q);
        expect(q.orWhereNotExists(sub2)).toBe(q);
        expect(q.orWhereNotExists(sub3)).toBe(q);
    });

    test('transaction, locking, clone, modify, columnInfo, newQuery', async () => {
        const q = db.table('builder_items');
        const mock = {
            batchInsert: jest.fn(),
            havingBetween: jest.fn(),
            transacting: jest.fn(),
            forUpdate: jest.fn(),
            forShare: jest.fn(),
            skipLocked: jest.fn(),
            noWait: jest.fn(),
            clone: jest.fn(() => ({})),
            modify: jest.fn((cb) => cb({}))
        };
        q.getQueryBuilder = () => mock;

        expect(q.batchInsert('builder_items', [])).toBe(q);
        expect(q.returning('id')).toBe(q);
        expect(q.transacting({})).toBe(q);
        expect(q.forUpdate()).toBe(q);
        expect(q.forShare()).toBe(q);
        expect(q.skipLocked()).toBe(q);
        expect(q.noWait()).toBe(q);

        const cloned = q.clone();
        expect(cloned).toBeDefined();

        let modified = false;
        q.modify((b) => { modified = true; });
        expect(modified).toBe(true);

        const colInfo = await db.table('builder_items').columnInfo();
        expect(colInfo).toBeDefined();

        const nq = db.table('builder_items').newQuery();
        expect(nq).toBeDefined();
    });

    test('last() returns the last inserted record', async () => {
        const lastItem = await db.table('builder_items').last();
        expect(lastItem).toBeDefined();
        expect(lastItem.title).toBe('Item 3');
    });

    test('count() returns 0 when no results', async () => {
        const emptyCount = await db.table('builder_items').where('id', 9999).count();
        expect(emptyCount).toBe(0);
    });

    test('paginate and simplePaginate with custom options and request simulation', async () => {
        const mockRequest = {
            input: jest.fn((k, def) => def),
            path: jest.fn(() => '/items')
        };
        const q = db.table('builder_items').request(mockRequest);
        const p1 = await q.paginate(1, 'page', null, 3);
        expect(p1).toBeDefined();

        const p2 = await db.table('builder_items').paginate(() => 2, 'page', 1);
        expect(p2).toBeDefined();

        const sp = await db.table('builder_items').request(mockRequest).simplePaginate(2, null);
        expect(sp).toBeDefined();
    });

    test('addWhereExistsQuery and pluck with value string', async () => {
        const q = db.table('builder_items');
        q.addWhereExistsQuery(db.table('builder_items'), 'and', false);
        q.addWhereExistsQuery(db.table('builder_items'), 'or', true);

        const plucked = await db.table('builder_items').pluck('title', 'score');
        expect(plucked).toBeDefined();

        // latest, oldest default column
        db.table('builder_items').latest();
        db.table('builder_items').oldest();

        // value with key present and missing
        const val = await db.table('builder_items').where('id', 1).value('title');
        expect(val).toBe('Item 1');
        const mockBuilderForVal = db.table('builder_items');
        mockBuilderForVal.first = () => Promise.resolve({ title: 'Item 1' });
        const missingKeyVal = await mockBuilderForVal.value('non_existent_key');
        expect(missingKeyVal).toBeNull();
        const nullVal = await db.table('builder_items').where('id', 9999).value('title');
        expect(nullVal).toBeNull();

        // count with null and empty array from getQueryBuilder
        const mockEmptyQuery = db.table('builder_items');
        mockEmptyQuery.getQueryBuilder = () => ({
            count: () => Promise.resolve([])
        });
        expect(await mockEmptyQuery.count()).toBe(0);

        mockEmptyQuery.getQueryBuilder = () => ({
            count: () => Promise.resolve(null)
        });
        expect(await mockEmptyQuery.count()).toBe(0);

        // paginate with zero total and simplePaginate without request
        const zeroPaginate = await db.table('builder_items').where('id', 99999).paginate();
        expect(zeroPaginate).toBeDefined();

        const simpleNoReq = await db.table('builder_items').simplePaginate();
        expect(simpleNoReq).toBeDefined();

        const simpleNullPage = await db.table('builder_items').simplePaginate(15, null);
        expect(simpleNullPage).toBeDefined();
    });
});

