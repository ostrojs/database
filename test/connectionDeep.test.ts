'use strict';

const { createDatabaseManager, createTestContainer } = require('./setup');
const _Connection = require('../src/connections/connection');
const Connection = _Connection.default || _Connection;

describe('Connection Full Branch Coverage Tests', () => {
    let db;
    let container;

    beforeEach(() => {
        const setup = createDatabaseManager();
        db = setup.db;
        container = setup.container;
    });

    afterEach(async () => {
        if (db) db.disconnect();
    });

    test('Connection full query execution and lifecycle paths', async () => {
        const conn = db.connection('sqlite');

        // Test beforeExecuting callback
        let beforeCalled = false;
        conn.beforeExecuting((query, bindings, c) => {
            beforeCalled = true;
        });

        const schema = conn.getSchemaBuilder();
        await schema.createTable('conn_test_items', (table) => {
            table.increments('id');
            table.string('name');
        });

        // Test insert
        await conn.insert("INSERT INTO conn_test_items (name) VALUES ('Alpha');");
        expect(beforeCalled).toBe(true);

        // Test selectOne
        const one = await conn.selectOne("SELECT * FROM conn_test_items WHERE name = 'Alpha';");
        expect(one.name).toBe('Alpha');

        // Test selectOne when select returns non-array (e.g. mock or object)
        const mockObjConn = new Connection({
            raw: () => ({ single: 'row' })
        });
        const nonArrResult = await mockObjConn.selectOne('SELECT 1');
        expect(nonArrResult).toEqual({ single: 'row' });

        // Test update
        const updatedCount = await conn.update("UPDATE conn_test_items SET name = 'Beta' WHERE name = 'Alpha';");
        expect(updatedCount).toBeDefined();

        // Test delete
        const deletedCount = await conn.delete("DELETE FROM conn_test_items WHERE name = 'Beta';");
        expect(deletedCount).toBeDefined();

        // Test transaction
        await conn.transaction(async (trx) => {
            await trx.table('conn_test_items').insert({ name: 'TrxItem' });
        });
        const trxItem = await conn.selectOne("SELECT * FROM conn_test_items WHERE name = 'TrxItem';");
        expect(trxItem.name).toBe('TrxItem');

        // Test database name and table prefix mutators
        conn.setDatabaseName(':memory:');
        expect(conn.getDatabaseName()).toBe(':memory:');

        conn.setTablePrefix('pfx_');
        expect(conn.getTablePrefix()).toBe('pfx_');
        conn.setTablePrefix('');

        // Test queryGrammar, schemaGrammar, postProcessor getters & setters
        const customGrammar = conn.getQueryGrammar();
        conn.setQueryGrammar(customGrammar);
        expect(conn.getQueryGrammar()).toBe(customGrammar);

        const customSchemaGrammar = conn.getDefaultSchemaGrammar();
        conn.setSchemaGrammar(customSchemaGrammar);
        expect(conn.getSchemaGrammar()).toBe(customSchemaGrammar);

        const customProcessor = conn.getDefaultPostProcessor();
        conn.setPostProcessor(customProcessor);
        expect(conn.getPostProcessor()).toBe(customProcessor);

        // Test readConnection
        const dummyRead = { isRead: true };
        conn.setReadConnection(() => dummyRead);
        expect(conn.getReadConnection()).toBe(dummyRead);

        conn.setReadConnection(dummyRead);
        expect(conn.getReadConnection()).toBe(dummyRead);

        conn.setReadConnection(null);
        expect(conn.getReadConnection()).toBeDefined();

        // Test auto close connection timer debounce and query-error/query-response events
        let destroyCalls = 0;
        let initCalls = 0;
        const mockKnex = {
            client: {
                acquireConnection: jest.fn().mockReturnValue(true),
                on: jest.fn()
            },
            destroy: () => { destroyCalls++; },
            initialize: () => { initCalls++; }
        };

        const testConn = new Connection(mockKnex, 'test_db', '', {
            connectionCloseTime: 5,
            destroy: true
        });

        // Set active connection to false to test line 285-287
        testConn.$activeConnection = false;
        testConn.$connection.client.acquireConnection();
        expect(initCalls).toBe(1);
        expect(testConn.$activeConnection).toBe(true);

        // Trigger query-response to decrement connectionCount and trigger disconnectConnection debounce
        const registeredCallbacks = testConn.$connection.client.on.mock.calls;
        for (const [event, cb] of registeredCallbacks) {
            if (typeof cb === 'function') {
                cb();
            }
        }

        // Wait for debounce timer (lines 274-277) to execute
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(destroyCalls).toBeGreaterThanOrEqual(1);
        expect(testConn.$activeConnection).toBe(false);

        testConn.disconnect();
        expect(testConn.$activeConnection).toBe(false);

        // Test getName, getDriverName, getColumnListing, and static resolvers
        const connWithConfig = new Connection(null, 'sample_db', 'tbl_', {
            name: 'my_conn',
            driver: 'sqlite'
        });
        expect(connWithConfig.getName()).toBe('my_conn');
        expect(connWithConfig.getDriverName()).toBe('sqlite');

        // Test static resolver methods
        Connection.resolverFor('custom_driver', () => 'custom_resolved');
        expect(Connection.getResolver('custom_driver')()).toBe('custom_resolved');
        expect(Connection.getResolver('unknown_driver')).toBeNull();

        // Test getColumnListing with schema mock
        const mockSchemaBuilder = {
            getColumnListing: jest.fn().mockResolvedValue(['id', 'title'])
        };
        connWithConfig.getSchemaBuilder = () => mockSchemaBuilder;
        const columns = await connWithConfig.getColumnListing('posts');
        expect(columns).toEqual(['id', 'title']);

        // Test base Connection getSchemaBuilder with null grammar (lines 60, 73-78)
        const baseConn = new Connection(null);
        expect(baseConn.getSchemaGrammar()).toBeUndefined();
        const baseSchema = baseConn.getSchemaBuilder();
        expect(baseSchema).toBeDefined();

        // Test run error handling catch block (lines 140-143)
        let handledError = false;
        const errConn = new Connection({
            raw: () => { throw new Error('Query failure'); }
        });
        errConn.handleQueryException = (e, q, b, c) => {
            handledError = true;
            return 'handled_query_error';
        };
        const errResult = await errConn.run('SELECT 1', []);
        expect(handledError).toBe(true);
        expect(errResult).toBe('handled_query_error');

        // Test reconnect without reconnector throwing LostConnectionException
        const noReconn = new Connection(null);
        expect(() => noReconn.reconnect()).toThrow(/Lost connection/);

        // Test reconnect with callable reconnector and reconnectIfMissingConnection
        let reconnectedCalled = false;
        noReconn.setReconnector((c) => {
            reconnectedCalled = true;
            c.$connection = { raw: () => 'reconnected_raw' };
            return c;
        });
        noReconn.reconnectIfMissingConnection();
        expect(reconnectedCalled).toBe(true);

        // Test table() and query() builders on connection
        const tblQuery = conn.table('users', 'u');
        expect(tblQuery).toBeDefined();
        const baseQuery = conn.query();
        expect(baseQuery).toBeDefined();

        // Test select, statement, affectingStatement default bindings and useReadPdo false
        await conn.select('SELECT 1');
        await conn.select('SELECT 1', [], false);
        await conn.statement('SELECT 1');
        await conn.affectingStatement('SELECT 1');

        // Test disconnect() when $connection has no destroy method and $disconnectTimer is null
        const dummyConn = new Connection(null);
        dummyConn.disconnect();
        dummyConn.$connection = {};
        dummyConn.disconnect();

        // Test getSchemaBuilder with null and already set grammar
        const schemaConn = new Connection(null);
        schemaConn.getSchemaBuilder();
        schemaConn.getSchemaBuilder();

        // Test initiateAutoCloseConnection when destroy is false
        const noDestroyConn = new Connection({
            client: { acquireConnection: jest.fn(), on: jest.fn() }
        }, 'db', 'pfx', {
            connectionCloseTime: 5,
            destroy: false
        });
        noDestroyConn.$connection.client.acquireConnection();
        for (const [event, cb] of noDestroyConn.$connection.client.on.mock.calls) {
            if (typeof cb === 'function') cb();
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    });
});
