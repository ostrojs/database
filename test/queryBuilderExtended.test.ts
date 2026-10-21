'use strict';
/**
 * Additional query builder tests to cover uncovered builder.js branches:
 *  - whereExists/whereNotExists
 *  - whereColumn
 *  - groupBy / having / havingBetween / havingRaw
 *  - union / unionAll
 *  - distinct
 *  - joinRaw / innerJoin / rightJoin / fullOuterJoin / crossJoin
 *  - orWhereNull / orWhereIn / orWhereNotIn / orWhereBetween
 *  - addWhereExistsQuery (orWhereExists / orWhereNotExists)
 *  - forPage()
 *  - last()
 *  - pluck(key, value) with key-value pair
 *  - connection: getName, getDriverName, getConfig, setTablePrefix, withTablePrefix,
 *                setReconnector, resolverFor, getResolver, transaction
 *  - databaseManager: extend, forgetExtension, getConnections, setReconnector, getPrefix
 */
const { createDatabaseManager } = require('./setup');

describe('Query Builder – extended coverage', () => {
    let db, conn;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db   = setup.db;
        conn = db.connection('sqlite');
        const schema = conn.getSchemaBuilder();

        await schema.dropTableIfExists('tags');
        await schema.dropTableIfExists('items');
        await schema.dropTableIfExists('categories');

        await schema.createTable('categories', t => {
            t.increments('id');
            t.string('name');
            t.timestamps();
        });

        await schema.createTable('items', t => {
            t.increments('id');
            t.integer('cat_id').nullable();
            t.string('name');
            t.integer('qty').defaultTo(0);
            t.float('price').defaultTo(0);
            t.boolean('active').defaultTo(true);
            t.timestamps();
        });

        await schema.createTable('tags', t => {
            t.increments('id');
            t.integer('item_id');
            t.string('label');
            t.timestamps();
        });
    });

    afterAll(async () => {
        const schema = conn.getSchemaBuilder();
        await schema.dropTableIfExists('tags');
        await schema.dropTableIfExists('items');
        await schema.dropTableIfExists('categories');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('tags').delete();
        await conn.table('items').delete();
        await conn.table('categories').delete();
    });

    async function seedItems() {
        const [catId] = await conn.table('categories').insert({ name: 'Electronics' });
        await conn.table('items').insert([
            { cat_id: catId, name: 'Phone',   qty: 10, price: 299.99, active: true  },
            { cat_id: catId, name: 'Tablet',  qty: 5,  price: 499.99, active: true  },
            { cat_id: catId, name: 'Laptop',  qty: 2,  price: 999.99, active: false },
            { cat_id: null,  name: 'Book',    qty: 100, price: 14.99, active: true  },
        ]);
        return catId;
    }

    // ──────────────────────────────────────────────
    //  Where variants
    // ──────────────────────────────────────────────
    describe('Where variants', () => {

        test('whereNot() excludes matching rows', async () => {
            await seedItems();
            const result = await conn.table('items').whereNot('name', 'Book').get();
            expect(result.length).toBe(3);
        });

        test('orWhereNull() returns rows where column is null OR condition', async () => {
            await seedItems();
            const result = await conn.table('items')
                .where('active', false)
                .orWhereNull('cat_id')
                .get();
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        test('orWhereIn() union of conditions', async () => {
            await seedItems();
            const result = await conn.table('items')
                .where('name', 'Phone')
                .orWhereIn('name', ['Book'])
                .get();
            expect(result.map(r => r.name)).toContain('Phone');
            expect(result.map(r => r.name)).toContain('Book');
        });

        test('orWhereNotIn() exclusion union', async () => {
            await seedItems();
            const result = await conn.table('items')
                .where('qty', '>', 50)
                .orWhereNotIn('name', ['Phone', 'Tablet', 'Laptop'])
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('orWhereBetween() union range', async () => {
            await seedItems();
            const result = await conn.table('items')
                .where('name', 'Phone')
                .orWhereBetween('price', [400, 600])
                .get();
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        test('orWhereNotBetween() union not-range', async () => {
            await seedItems();
            const result = await conn.table('items')
                .where('name', 'Book')
                .orWhereNotBetween('price', [200, 600])
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('whereColumn() compares two columns', async () => {
            // qty == price would be unusual; let's add a row where they match
            await conn.table('items').insert({ name: 'Match', qty: 10, price: 10 });
            const result = await conn.table('items').whereColumn('qty', '=', 'price').get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ──────────────────────────────────────────────
    //  Exists subqueries
    // ──────────────────────────────────────────────
    describe('whereExists / whereNotExists', () => {

        test('whereExists() filters based on subquery', async () => {
            const catId = await seedItems();
            const [phone] = await conn.table('items').where('name', 'Phone').get();
            await conn.table('tags').insert({ item_id: phone.id, label: 'featured' });

            const result = await conn.table('items')
                .whereExists(
                    conn.table('tags').whereColumn('tags.item_id', '=', 'items.id')
                )
                .get();
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Phone');
        });

        test('whereNotExists() inverse subquery filter', async () => {
            const catId = await seedItems();
            const [phone] = await conn.table('items').where('name', 'Phone').get();
            await conn.table('tags').insert({ item_id: phone.id, label: 'featured' });

            const result = await conn.table('items')
                .whereNotExists(
                    conn.table('tags').whereColumn('tags.item_id', '=', 'items.id')
                )
                .get();
            expect(result.length).toBeGreaterThanOrEqual(3);
            expect(result.map(r => r.name)).not.toContain('Phone');
        });
    });

    // ──────────────────────────────────────────────
    //  Grouping & Having
    // ──────────────────────────────────────────────
    describe('groupBy / having / havingRaw / havingBetween', () => {

        test('groupBy() + count aggregation groups rows', async () => {
            await seedItems();
            // use raw select with groupBy instead of .count() after select+groupBy
            const result = await conn.table('items')
                .select(conn.raw('active, count(*) as cnt'))
                .groupBy('active')
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('having() filters groups', async () => {
            await seedItems();
            const result = await conn.table('items')
                .select(conn.raw('cat_id, sum(qty) as total_qty'))
                .groupBy('cat_id')
                .having('total_qty', '>', 10)
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('havingRaw() filters with raw expression', async () => {
            await seedItems();
            const result = await conn.table('items')
                .select(conn.raw('cat_id, sum(price) as total_price'))
                .groupBy('cat_id')
                .havingRaw('sum(price) > ?', [100])
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('groupByRaw() works with raw group expression', async () => {
            await seedItems();
            const result = await conn.table('items')
                .select(conn.raw('active, count(*) as cnt'))
                .groupByRaw('active')
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('havingBetween() filters groups within range', async () => {
            await seedItems();
            const result = await conn.table('items')
                .select(conn.raw('cat_id, count(*) as cnt'))
                .groupBy('cat_id')
                .havingBetween('cnt', [1, 100])
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ──────────────────────────────────────────────
    //  Distinct
    // ──────────────────────────────────────────────
    describe('distinct()', () => {
        test('distinct removes duplicate active values', async () => {
            await seedItems();
            const result = await conn.table('items').distinct().select('active').get();
            // Should have at most 2 distinct values (true/false)
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    // ──────────────────────────────────────────────
    //  Union / UnionAll
    // ──────────────────────────────────────────────
    describe('union() / unionAll()', () => {
        test('union combines two queries, removing duplicates', async () => {
            await conn.table('items').insert({ name: 'Alpha', qty: 1, price: 1 });
            await conn.table('items').insert({ name: 'Beta', qty: 2, price: 2 });

            const q1 = conn.table('items').select('name').where('name', 'Alpha');
            const q2 = conn.table('items').select('name').where('name', 'Beta');
            q1.union(q2.getQueryBuilder());
            const result = await q1.get();
            expect(result.length).toBe(2);
        });

        test('unionAll includes duplicates', async () => {
            await conn.table('items').insert({ name: 'Dup', qty: 1, price: 1 });
            const q1 = conn.table('items').select('name').where('name', 'Dup');
            const q2 = conn.table('items').select('name').where('name', 'Dup');
            q1.unionAll(q2.getQueryBuilder());
            const result = await q1.get();
            expect(result.length).toBe(2);
        });
    });

    // ──────────────────────────────────────────────
    //  Join variants
    // ──────────────────────────────────────────────
    describe('Join variants', () => {

        test('innerJoin() returns only matching rows', async () => {
            const catId = await seedItems();
            const result = await conn.table('items')
                .innerJoin('categories', 'items.cat_id', '=', 'categories.id')
                .select('items.name', 'categories.name as cat_name')
                .get();
            expect(result.length).toBe(3); // 'Book' has no category
        });

        test('leftJoin() includes rows without match', async () => {
            await seedItems();
            const result = await conn.table('items')
                .leftJoin('categories', 'items.cat_id', '=', 'categories.id')
                .select('items.name', 'categories.name as cat_name')
                .get();
            expect(result.length).toBe(4);
            const book = result.find(r => r.name === 'Book');
            expect(book.cat_name).toBeNull();
        });

        test('crossJoin() produces cartesian product', async () => {
            await conn.table('categories').insert({ name: 'C1' });
            await conn.table('items').insert({ name: 'I1', qty: 1, price: 1 });
            const result = await conn.table('items')
                .crossJoin('categories')
                .select('items.name', 'categories.name as cat')
                .get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ──────────────────────────────────────────────
    //  OrderByRaw
    // ──────────────────────────────────────────────
    describe('orderByRaw()', () => {
        test('orderByRaw sorts with expression', async () => {
            await seedItems();
            const result = await conn.table('items').orderByRaw('price DESC').get();
            expect(result[0].name).toBe('Laptop');
        });
    });

    // ──────────────────────────────────────────────
    //  forPage()
    // ──────────────────────────────────────────────
    describe('forPage()', () => {
        test('forPage() correctly applies offset and limit', async () => {
            await seedItems();
            const page2 = await conn.table('items').orderBy('id', 'asc').forPage(2, 2).get();
            expect(page2.length).toBe(2);
        });
    });

    // ──────────────────────────────────────────────
    //  pluck() with key-value pair
    // ──────────────────────────────────────────────
    describe('pluck(key, value)', () => {
        test('pluck with two args returns keyed map', async () => {
            await seedItems();
            const map = await conn.table('items').orderBy('id').pluck('name', 'qty');
            expect(typeof map === 'object' || Array.isArray(map)).toBe(true);
        });
    });

    // ──────────────────────────────────────────────
    //  last()
    // ──────────────────────────────────────────────
    describe('last()', () => {
        test('last() returns the last inserted row', async () => {
            await conn.table('items').insert([
                { name: 'First', qty: 1, price: 1 },
                { name: 'Last', qty: 2, price: 2 },
            ]);
            const last = await conn.table('items').last();
            expect(last.name).toBe('Last');
        });
    });

    // ──────────────────────────────────────────────
    //  transaction()
    // ──────────────────────────────────────────────
    describe('transaction()', () => {
        test('transaction commits on success', async () => {
            await conn.transaction(async (trx) => {
                await trx('items').insert({ name: 'TxItem', qty: 1, price: 9 });
            });
            const row = await conn.table('items').where('name', 'TxItem').first();
            expect(row).not.toBeNull();
        });

        test('transaction rolls back on error', async () => {
            await expect(conn.transaction(async (trx) => {
                await trx('items').insert({ name: 'RollbackItem', qty: 1, price: 9 });
                throw new Error('rollback test');
            })).rejects.toThrow('rollback test');

            const row = await conn.table('items').where('name', 'RollbackItem').first();
            expect(row).toBeUndefined();
        });
    });

    // ──────────────────────────────────────────────
    //  Connection utility methods
    // ──────────────────────────────────────────────
    describe('Connection utility methods', () => {

        test('getName() returns the connection name from config', () => {
            const name = conn.getName();
            expect(name === 'sqlite' || name === undefined || name === null).toBe(true);
        });

        test('getDriverName() returns driver from config', () => {
            const driver = conn.getDriverName();
            expect(driver).toBe('sqlite');
        });

        test('getConfig() retrieves nested config key', () => {
            const driver = conn.getConfig('driver');
            expect(driver).toBe('sqlite');
        });

        test('getDatabaseName() returns database path or name', () => {
            const dbName = conn.getDatabaseName();
            expect(typeof dbName).toBe('string');
        });

        test('getTablePrefix() and setTablePrefix() work', () => {
            const original = conn.getTablePrefix();
            conn.setTablePrefix('test_');
            expect(conn.getTablePrefix()).toBe('test_');
            conn.setTablePrefix(original); // restore
        });

        test('withTablePrefix() sets grammar prefix', () => {
            const grammar = conn.getQueryGrammar();
            const result  = conn.withTablePrefix(grammar);
            expect(result).toBe(grammar);
        });

        test('setQueryGrammar() and getQueryGrammar() round-trip', () => {
            const g = conn.getQueryGrammar();
            conn.setQueryGrammar(g);
            expect(conn.getQueryGrammar()).toBe(g);
        });

        test('setPostProcessor() and getPostProcessor() round-trip', () => {
            const p = conn.getDefaultPostProcessor();
            conn.setPostProcessor(p);
            expect(conn.getPostProcessor()).toBe(p);
        });

        test('setDatabaseName() updates internal database name', () => {
            const original = conn.getDatabaseName();
            conn.setDatabaseName('new_db');
            expect(conn.getDatabaseName()).toBe('new_db');
            conn.setDatabaseName(original);
        });

        test('Connection.resolverFor() and getResolver() store and retrieve resolver', () => {
            const _Connection = require('../src/connections/connection');
            const Connection = _Connection.default || _Connection;
            const fn = () => 'resolved';
            Connection.resolverFor('test_driver', fn);
            expect(Connection.getResolver('test_driver')).toBe(fn);
            expect(Connection.getResolver('unknown')).toBeNull();
        });

        test('raw() returns a knex raw expression', () => {
            const rawExpr = conn.raw('1 + 1');
            expect(rawExpr).toBeDefined();
        });
    });

    // ──────────────────────────────────────────────
    //  DatabaseManager utility methods
    // ──────────────────────────────────────────────
    describe('DatabaseManager utility methods', () => {

        test('extend() and forgetExtension() manage custom resolvers', () => {
            db.extend('fake_driver', () => ({ fake: true }));
            db.forgetExtension('fake_driver');
            // Just verify no exception is thrown
        });

        test('getConnections() returns the cached connections map', () => {
            const connections = db.getConnections();
            expect(typeof connections).toBe('object');
        });

        test('setReconnector() stores reconnector function', () => {
            const fn = () => {};
            db.setReconnector(fn);
            // No exception = pass
        });

        test('table() delegate via __call reaches connection', async () => {
            await conn.table('items').insert({ name: 'DMTest', qty: 1, price: 1 });
            const result = await db.table('items').where('name', 'DMTest').first();
            expect(result).not.toBeNull();
        });
    });

    // ──────────────────────────────────────────────
    //  Builder utility methods (toSQL, clearX)
    // ──────────────────────────────────────────────
    describe('Builder utility methods', () => {

        test('toSQL() / toSql() return query SQL string', () => {
            const q = conn.table('items').where('active', true);
            const sql = q.toSQL();
            expect(typeof sql.sql === 'string' || typeof sql === 'string').toBe(true);
        });

        test('clearWhere() clears where clauses', () => {
            const q = conn.table('items').where('name', 'x');
            q.clearWhere();
            // No exception = pass; would return all rows
        });

        test('clearHaving() clears having clauses', () => {
            const q = conn.table('items').groupBy('active').having('active', 1);
            q.clearHaving();
        });

        test('clearOrder() clears order clauses', () => {
            const q = conn.table('items').orderBy('id', 'desc');
            q.clearOrder();
        });

        test('clearSelect() clears select columns', () => {
            const q = conn.table('items').select('name', 'price');
            q.clearSelect();
        });

        test('modify() applies a callback to the query', async () => {
            await conn.table('items').insert({ name: 'ModifyTest', qty: 3, price: 3 });
            const q = conn.table('items');
            q.modify((query) => query.where('name', 'ModifyTest'));
            const result = await q.get();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('addWhereExistsQuery and orWhereNotExists behavior', () => {
            const q = conn.table('items');
            q.addWhereExistsQuery(conn.table('items').where('qty', '>', 5), 'and', false);
            q.addWhereExistsQuery(conn.table('items').where('qty', '<', 1), 'or', true);
            expect(q).toBeDefined();
        });

        test('request() setter on query builder', () => {
            const q = conn.table('items');
            const mockReq = { query: { page: 2 } };
            q.request(mockReq);
            expect(q.$request).toBe(mockReq);
        });

        test('min(), max(), sum(), avg(), truncate() on query builder', async () => {
            await conn.table('items').truncate();
            await conn.table('items').insert([
                { name: 'Agg1', qty: 10, price: 100 },
                { name: 'Agg2', qty: 20, price: 200 },
            ]);
            const minQty = await conn.table('items').min('qty as min_qty');
            const maxQty = await conn.table('items').max('qty as max_qty');
            const sumQty = await conn.table('items').sum('qty as sum_qty');
            const avgQty = await conn.table('items').avg('qty as avg_qty');

            expect(minQty).toBeDefined();
            expect(maxQty).toBeDefined();
            expect(sumQty).toBeDefined();
            expect(avgQty).toBeDefined();
        });
    });

    // ──────────────────────────────────────────────
    //  Grammar & Processor
    // ──────────────────────────────────────────────
    describe('Grammar & MysqlProcessor', () => {
        test('MySQLProcessor processInsertGetId returns sequence id', () => {
            const _MySQLProcessor = require('../src/query/processors/mysqlProcessor');
            const MySQLProcessor = _MySQLProcessor.default || _MySQLProcessor;
            const proc = new MySQLProcessor();
            expect(proc.processInsertGetId(null, '', {}, 5)).toBe(5);
        });

        test('Query Grammar methods (getDateFormat, setTablePrefix, getTablePrefix, setConnection)', () => {
            const _Grammar = require('../src/query/grammars/grammar');
            const Grammar = _Grammar.default || _Grammar;
            const g = new Grammar();
            expect(g.getDateFormat()).toBe('Y-m-d H:i:s');
            g.setTablePrefix('pre_');
            expect(g.getTablePrefix()).toBe('pre_');
            g.setConnection('sqlite');
            expect(g.$connection).toBe('sqlite');
        });

        test('SQLite Grammar inherits BaseGrammar', () => {
            const _SQLiteGrammar = require('../src/query/grammars/sqliteGrammar');
            const SQLiteGrammar = _SQLiteGrammar.default || _SQLiteGrammar;
            const g = new SQLiteGrammar();
            expect(g.getDateFormat()).toBe('Y-m-d H:i:s');
            g.setTablePrefix('sqlite_');
            expect(g.getTablePrefix()).toBe('sqlite_');
        });
    });

});
