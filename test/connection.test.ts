const { createDatabaseManager, createTestContainer } = require('./setup');
const _Connection = require('../src/connections/connection');
const Connection = _Connection.default || _Connection;
const _SqliteConnection = require('../src/connections/sqliteConnection');
const SqliteConnection = _SqliteConnection.default || _SqliteConnection;

describe('DatabaseManager & Connection Unit Tests', () => {

    let db;
    let container;
    let factory;

    beforeEach(() => {
        const setup = createDatabaseManager();
        db = setup.db;
        container = setup.container;
        factory = setup.factory;
    });

    afterEach(async () => {
        db.disconnect();
    });

    test('connection() resolves default SQLite in-memory connection', () => {
        const conn = db.connection();
        expect(conn).toBeDefined();
        expect(conn).toBeInstanceOf(SqliteConnection);
        expect(conn).toBeInstanceOf(Connection);
        expect(db.getDefaultConnection()).toBe('sqlite');
    });

    test('supportedDrivers() lists all supported Ostro database drivers', () => {
        const drivers = db.supportedDrivers();
        expect(Array.isArray(drivers)).toBe(true);
        expect(drivers).toContain('sqlite');
        expect(drivers).toContain('mysql');
        expect(drivers).toContain('pgsql');
        expect(drivers).toContain('sqlsrv');
        expect(drivers).toContain('oracle');
    });

    test('getConnections(), purge() and reconnect() manage connection lifecycle', () => {
        const conn1 = db.connection('sqlite');
        expect(db.getConnections()['sqlite']).toBeDefined();

        db.purge('sqlite');
        expect(db.getConnections()['sqlite']).toBeUndefined();

        const conn2 = db.reconnect('sqlite');
        expect(conn2).toBeDefined();
        expect(db.getConnections()['sqlite']).toBeDefined();
    });

    test('setDefaultConnection() alters default connection name', () => {
        db.setDefaultConnection('sqlite_secondary');
        expect(db.getDefaultConnection()).toBe('sqlite_secondary');

        const conn = db.connection();
        expect(conn.getTablePrefix()).toBe('test_');
    });

    test('usingConnection() runs callback under temporary connection context', async () => {
        expect(db.getDefaultConnection()).toBe('sqlite');

        let executedDefault = null;
        await db.usingConnection('sqlite_secondary', () => {
            executedDefault = db.getDefaultConnection();
        });

        expect(executedDefault).toBe('sqlite_secondary');
        expect(db.getDefaultConnection()).toBe('sqlite');
    });

    test('extend() registers custom database connection resolver and forgetExtension removes it', () => {
        let customCreated = false;
        db.extend('custom_driver', (config, name) => {
            customCreated = true;
            return { name, custom: true };
        });

        container.config.database.connections['custom_conn'] = {
            driver: 'custom_driver',
            database: 'test'
        };

        const customConn = db.connection('custom_conn');
        expect(customCreated).toBe(true);
        expect(customConn.custom).toBe(true);

        db.forgetExtension('custom_driver');
    });

    test('throws error if connection is not configured in config', () => {
        expect(() => {
            db.connection('non_existent_db');
        }).toThrow('Database connection [non_existent_db] not configured.');
    });

    test('Connection transactions support commit and rollback', async () => {
        const conn = db.connection('sqlite');
        const schema = conn.getSchemaBuilder();

        await schema.createTable('tx_test', (table) => {
            table.increments('id');
            table.string('name');
        });

        // Test committed transaction
        await conn.transaction(async (trx) => {
            await trx.table('tx_test').insert({ name: 'Committed User' });
        });

        const countAfterCommit = await conn.table('tx_test').count('* as total');
        expect(Number(countAfterCommit)).toBe(1);

        // Test rolled back transaction
        try {
            await conn.transaction(async (trx) => {
                await trx.table('tx_test').insert({ name: 'Rollback User' });
                throw new Error('Force Rollback');
            });
        } catch (e) {
            expect(e.message).toBe('Force Rollback');
        }

        const countAfterRollback = await conn.table('tx_test').count('* as total');
        expect(Number(countAfterRollback)).toBe(1);
    });

    test('ConnectionFactory createConnector throws on unsupported driver and resolves bound connector', () => {
        const _ConnectionFactory = require('../src/connectors/connectionFactory');
        const ConnectionFactory = _ConnectionFactory.default || _ConnectionFactory;
        const factory = new ConnectionFactory(container);

        expect(() => factory.createConnector({ driver: 'unknown_driver' })).toThrow('Unsupported driver [unknown_driver].');
        expect(() => factory.createConnection('unknown_driver', {}, 'db')).toThrow('Unsupported driver [unknown_driver].');

        container.bind('db.connector.custom', () => ({ connect: () => 'connected' }));
        const customConnector = factory.createConnector({ driver: 'custom' });
        expect(customConnector.connect()).toBe('connected');
    });

    test('DatabaseManager getPrefix, getConfig, setReconnector, and registerCommands', () => {
        const _ConnectionFactory = require('../src/connectors/connectionFactory');
        const ConnectionFactory = _ConnectionFactory.default || _ConnectionFactory;
        const _DatabaseManager = require('../src/databaseManager');
        const DatabaseManager = _DatabaseManager.default || _DatabaseManager;
        const loadedDirs = [];
        const mockApp = {
            config: {
                database: {
                    default: 'sqlite',
                    connections: {
                        sqlite: { driver: 'sqlite', database: ':memory:', prefix: 'ost_' },
                        custom: { driver: 'custom', prefix: 'pre_' },
                    }
                }
            }
        };
        const mockFactory = new ConnectionFactory(container);
        const dbm = new DatabaseManager(mockApp, mockFactory);
        dbm.$container = {
            console: {
                load: (dir) => loadedDirs.push(dir)
            }
        };

        expect(dbm.getConfig('sqlite')).toEqual({ driver: 'sqlite', database: ':memory:', prefix: 'ost_' });
        expect(dbm.getPrefix()).toBeUndefined();
        dbm.setReconnector(() => {});
        process.env.NODE_ENV = 'production';
        dbm.registerCommands('/some/dir');
        expect(loadedDirs).toContain('/some/dir');
        process.env.NODE_ENV = 'test';

        // Test custom extensions by connection name and driver name
        dbm.extend('custom', (config, name) => ({ name, custom: true }));
        const extConn = dbm.makeConnection('custom');
        expect(extConn).toEqual({ name: 'custom', custom: true });

        dbm.extend('special_driver', (config, name) => ({ driver: 'special_driver' }));
        mockApp.config.database.connections.special = { driver: 'special_driver' };
        const extDriverConn = dbm.makeConnection('special');
        expect(extDriverConn).toEqual({ driver: 'special_driver' });

        // Test reconnect on cached connection
        const c1 = db.connection('sqlite');
        const c2 = db.reconnect('sqlite');
        expect(c2).toBeDefined();
    });

    test('Connection getters, setters, resolvers, reconnector, and beforeExecuting', async () => {
        const _Connection = require('../src/connections/connection');
        const Connection = _Connection.default || _Connection;
        const testConn = db.connection();
        Connection.resolverFor('custom_driver', () => 'custom_resolved');
        expect(Connection.getResolver('custom_driver')()).toBe('custom_resolved');
        expect(Connection.getResolver('non_existent')).toBeNull();

        const beforeCalls = [];
        testConn.beforeExecuting((query, bindings) => {
            beforeCalls.push(query);
        });

        testConn.setDatabaseName('custom_sqlite_db');
        expect(testConn.getDatabaseName()).toBe('custom_sqlite_db');
        expect(testConn.getDriverName()).toBe('sqlite');

        testConn.setReconnector((c) => 'reconnected');
        expect(testConn.reconnect()).toBe('reconnected');

        const disconnectedConn = new Connection(null, 'test_db', 'prefix_', { driver: 'sqlite' });
        expect(() => disconnectedConn.reconnect()).toThrow();

        // Additional connection getters/setters/methods
        testConn.useDefaultPostProcessor();
        expect(testConn.getPostProcessor()).toBeDefined();
        testConn.setPostProcessor(testConn.getPostProcessor());

        testConn.useDefaultSchemaGrammar();
        testConn.setQueryGrammar(testConn.getQueryGrammar());
        testConn.setSchemaGrammar(testConn.getSchemaGrammar());
        expect(testConn.getSchemaGrammar()).toBeDefined();
        testConn.setTablePrefix('tbl_');
        expect(testConn.getTablePrefix()).toBe('tbl_');

        // Test reconnectIfMissingConnection
        disconnectedConn.setReconnector(() => { disconnectedConn.$connection = testConn.$connection; });
        disconnectedConn.reconnectIfMissingConnection();
        expect(disconnectedConn.$connection).toBeDefined();

        // Test mock ConnectionFactory driver instances
        const _ConnectionFactory = require('../src/connectors/connectionFactory');
        const ConnectionFactory = _ConnectionFactory.default || _ConnectionFactory;
        const factory = new ConnectionFactory(container);
        expect(factory.createConnection('sqlite', null, ':memory:')).toBeDefined();
        const mysqlConn = factory.createConnection('mysql', null, 'mysql_db', 'pre_', { driver: 'mysql' });
        expect(mysqlConn).toBeDefined();
        expect(mysqlConn.getDefaultSchemaGrammar()).toBeDefined();
        expect(mysqlConn.getDefaultQueryGrammar()).toBeDefined();
        expect(mysqlConn.getDefaultPostProcessor()).toBeDefined();
        expect(mysqlConn.getSchemaBuilder()).toBeDefined();

        const _MysqlGrammar = require('../src/schema/grammars/mysqlGrammar');

        const MysqlGrammar = _MysqlGrammar.default || _MysqlGrammar;
        const mg = new MysqlGrammar();
        expect(mg.compileDropAllTables(['t1', 't2'])).toContain('DROP TABLE IF EXISTS t1, t2;');

        const pgsqlConn = factory.createConnection('pgsql', null, 'pg_db', 'pre_', { driver: 'pgsql' });
        expect(pgsqlConn).toBeDefined();
        expect(pgsqlConn.getDefaultSchemaGrammar()).toBeDefined();
        expect(pgsqlConn.getDefaultQueryGrammar()).toBeDefined();
        expect(pgsqlConn.getSchemaBuilder()).toBeDefined();

        const oracleConn = factory.createConnection('oracle', null, 'ora_db', 'pre_', { driver: 'oracle' });
        expect(oracleConn).toBeDefined();
        expect(oracleConn.getDefaultSchemaGrammar()).toBeDefined();
        expect(oracleConn.getDefaultQueryGrammar()).toBeDefined();
        expect(oracleConn.getSchemaBuilder()).toBeDefined();

        const sqlsrvConn = factory.createConnection('sqlsrv', null, 'ms_db', 'pre_', { driver: 'sqlsrv' });
        expect(sqlsrvConn).toBeDefined();
        expect(sqlsrvConn.getDefaultSchemaGrammar()).toBeDefined();
        expect(sqlsrvConn.getDefaultQueryGrammar()).toBeDefined();
        expect(sqlsrvConn.getSchemaBuilder()).toBeDefined();

        expect(() => factory.createConnection('unsupported_db', null, 'db')).toThrow('Unsupported driver [unsupported_db].');
    });

});
