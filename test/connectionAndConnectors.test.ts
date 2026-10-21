'use strict';

const { createDatabaseManager, createTestContainer } = require('./setup');
const _ConnectionFactory = require('../src/connectors/connectionFactory');
const ConnectionFactory = _ConnectionFactory.default || _ConnectionFactory;
const _Connection = require('../src/connections/connection');
const Connection = _Connection.default || _Connection;
const _MysqlConnection = require('../src/connections/mysqlConnection');
const MysqlConnection = _MysqlConnection.default || _MysqlConnection;
const _PostgresConnection = require('../src/connections/postgresConnection');
const PostgresConnection = _PostgresConnection.default || _PostgresConnection;
const _SqlServerConnection = require('../src/connections/sqlServerConnection');
const SqlServerConnection = _SqlServerConnection.default || _SqlServerConnection;
const _OracleConnection = require('../src/connections/oracleConnection');
const OracleConnection = _OracleConnection.default || _OracleConnection;
const _SqliteConnection = require('../src/connections/sqliteConnection');
const SqliteConnection = _SqliteConnection.default || _SqliteConnection;
const _Seeder = require('../src/seeder');
const Seeder = _Seeder.default || _Seeder;

describe('Connection, Connectors & Driver Proxies Deep Tests', () => {

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
        if (db) {
            db.disconnect();
        }
    });

    test('db.builder() delegates to connection()', () => {
        const conn = db.builder('sqlite');
        expect(conn).toBeDefined();
        expect(typeof conn.table).toBe('function');

        const defConn = db.builder();
        expect(defConn).toBeDefined();

        // registerCommands test with this.$app (when $container is undefined)
        let commandLoaded = null;
        container.console = {
            load(dir) { commandLoaded = dir; }
        };
        db.registerCommands('/fake/commands/dir');
        expect(commandLoaded).toBe('/fake/commands/dir');

        // registerCommands test with explicit this.$container
        let containerLoaded = null;
        db.$container = {
            console: {
                load(dir) { containerLoaded = dir; }
            }
        };
        db.registerCommands('/fake/explicit/dir');
        expect(containerLoaded).toBe('/fake/explicit/dir');
        db.$container = undefined;

        // Test production branch (should not load when production is true)
        process.env.production = 'true';
        let prodLoaded = false;
        container.console.load = () => { prodLoaded = true; };
        db.registerCommands('/prod/dir');
        expect(prodLoaded).toBe(false);
        delete process.env.production;

        // Test container without console or load not a function
        container.console = {};
        expect(() => db.registerCommands('/dir')).not.toThrow();
        container.console = null;
        expect(() => db.registerCommands('/dir')).not.toThrow();

        // Test when neither container nor app exists
        const origApp = db.$app;
        db.$app = null;
        expect(() => db.registerCommands('/dir')).not.toThrow();
        db.$app = origApp;
    });

    test('reconnector callback triggers reconnect', () => {
        const conn = db.connection('sqlite');
        expect(db.$reconnector).toBeDefined();
        expect(typeof db.$reconnector).toBe('function');
        db.$reconnector(conn);
        expect(db.getConnections()['sqlite']).toBeDefined();
    });

    test('ConnectionFactory throws on unsupported driver', () => {
        const customFactory = new ConnectionFactory(container);
        expect(() => {
            customFactory.createConnector({ driver: 'unsupported_db_driver' });
        }).toThrow(/Unsupported driver/);

        // factory.make with default name parameter (name = null)
        const createdFromConfig = factory.make({ driver: 'sqlite', database: ':memory:' });
        expect(createdFromConfig).toBeDefined();
    });

    test('ConnectionFactory creates connectors for mysql, pgsql, sqlite, oracle, sqlsrv', () => {
        const customFactory = new ConnectionFactory(container);
        expect(customFactory.createConnector({ driver: 'mysql' })).toBeDefined();
        expect(customFactory.createConnector({ driver: 'pgsql' })).toBeDefined();
        expect(customFactory.createConnector({ driver: 'sqlite' })).toBeDefined();
        expect(customFactory.createConnector({ driver: 'oracle' })).toBeDefined();
        expect(customFactory.createConnector({ driver: 'sqlsrv' })).toBeDefined();
    });

    test('ConnectionFactory retrieves connector from container binding if bound', () => {
        const customContainer = createTestContainer();
        const dummyConnector = { connect: jest.fn() };
        customContainer.instance('db.connector.custom', dummyConnector);

        const customFactory = new ConnectionFactory(customContainer);
        expect(customFactory.createConnector({ driver: 'custom' })).toBe(dummyConnector);
    });

    test('ConnectionFactory creates connections for all built-in drivers', () => {
        const customFactory = new ConnectionFactory(container);
        const mockKnex = {
            client: { acquireConnection: jest.fn(), on: jest.fn() },
            select: jest.fn()
        };

        const myConn = customFactory.createConnection('mysql', mockKnex, 'test_db');
        expect(myConn).toBeDefined();
        expect(myConn.getSchemaBuilder()).toBeDefined();

        const pgConn = customFactory.createConnection('pgsql', mockKnex, 'test_db');
        expect(pgConn).toBeDefined();
        expect(pgConn.getSchemaBuilder()).toBeDefined();

        const sqliteConn = customFactory.createConnection('sqlite', mockKnex, 'test_db');
        expect(sqliteConn).toBeDefined();
        expect(sqliteConn.getSchemaBuilder()).toBeDefined();

        const oraConn = customFactory.createConnection('oracle', mockKnex, 'test_db');
        expect(oraConn).toBeDefined();
        expect(oraConn.getSchemaBuilder()).toBeDefined();

        const sqlsrvConn = customFactory.createConnection('sqlsrv', mockKnex, 'test_db');
        expect(sqlsrvConn).toBeDefined();
        expect(sqlsrvConn.getSchemaBuilder()).toBeDefined();
    });

    test('ConnectionFactory utilizes custom Connection resolver if registered', () => {
        const customFactory = new ConnectionFactory(container);
        const mockConnectionInstance = { custom: true };
        Connection.resolverFor('custom_driver', () => mockConnectionInstance);

        const created = customFactory.createConnection('custom_driver', {}, 'test_db');
        expect(created).toBe(mockConnectionInstance);
    });

    test('SqliteConnector options and foreign keys flag handling', () => {
        const _SqliteConnector = require('../src/connectors/sqliteConnector');
        const SqliteConnector = _SqliteConnector.default || _SqliteConnector;
        const connector = new SqliteConnector();

        const connOn = connector.connect({
            database: ':memory:',
            foreign_key_constraints: true,
            useNullAsDefault: false,
            asyncStackTraces: false
        }, ':memory:');
        expect(connOn).toBeDefined();

        const connOff = connector.connect({
            database: ':memory:',
            foreign_key_constraints: false
        }, ':memory:');
        expect(connOff).toBeDefined();
    });

    test('Connection driver proxies: MysqlConnection, PostgresConnection, SqlServerConnection, OracleConnection', () => {
        const mockKnex = {
            client: {
                acquireConnection: jest.fn(),
                on: jest.fn()
            },
            select: jest.fn().mockReturnValue('selected'),
            raw: jest.fn().mockReturnValue('raw_query')
        };

        const mysql = new MysqlConnection(mockKnex);
        expect(mysql.getDefaultSchemaGrammar()).toBeDefined();
        expect(mysql.getDefaultQueryGrammar()).toBeDefined();
        expect(mysql.getDefaultPostProcessor()).toBeDefined();
        expect(mysql.getSchemaBuilder()).toBeDefined();
        expect(mysql.__call(mysql, 'select', ['arg1'])).toBe('selected');

        const pgsql = new PostgresConnection(mockKnex);
        expect(pgsql.getDefaultSchemaGrammar()).toBeDefined();
        expect(pgsql.getDefaultQueryGrammar()).toBeDefined();
        expect(pgsql.getDefaultPostProcessor()).toBeDefined();
        expect(pgsql.getSchemaBuilder()).toBeDefined();
        expect(pgsql.__call(pgsql, 'raw', ['arg2'])).toBe('raw_query');

        const sqlsrv = new SqlServerConnection(mockKnex);
        expect(sqlsrv.getDefaultSchemaGrammar()).toBeDefined();
        expect(sqlsrv.getDefaultQueryGrammar()).toBeDefined();
        expect(sqlsrv.getDefaultPostProcessor()).toBeDefined();
        expect(sqlsrv.getSchemaBuilder()).toBeDefined();
        expect(sqlsrv.__call(sqlsrv, 'select', ['arg3'])).toBe('selected');

        const oracle = new OracleConnection(mockKnex);
        expect(oracle.getDefaultSchemaGrammar()).toBeDefined();
        expect(oracle.getDefaultQueryGrammar()).toBeDefined();
        expect(oracle.getDefaultPostProcessor()).toBeDefined();
        expect(oracle.getSchemaBuilder()).toBeDefined();
        expect(oracle.__call(oracle, 'raw', ['arg4'])).toBe('raw_query');

        const sqlite = new SqliteConnection(mockKnex);
        expect(sqlite.__call(sqlite, 'select', ['arg5'])).toBe('selected');
    });

    test('ConnectionFactory make handles read/write config and host parsing', () => {
        const customFactory = new ConnectionFactory(container);
        const rwConfig = {
            driver: 'sqlite',
            database: ':memory:',
            read: [{ database: ':memory:' }],
            write: [{ database: ':memory:' }]
        };

        const conn = customFactory.make(rwConfig, 'rw_test');
        expect(conn).toBeDefined();

        // Test read/write with direct object (not array) and single connection with and without host
        const rwDirectConfig = {
            driver: 'sqlite',
            database: ':memory:',
            read: { database: ':memory:' },
            write: { database: ':memory:' }
        };
        const connDirect = customFactory.make(rwDirectConfig, 'rw_direct_test');
        expect(connDirect).toBeDefined();

        // Test single connection with host (exercises createConnectionResolverWithHosts)
        const connWithHost = customFactory.make({
            driver: 'sqlite',
            database: ':memory:',
            host: '127.0.0.1'
        }, 'host_test');
        expect(connWithHost).toBeDefined();

        expect(() => {
            customFactory.parseHost({ host: [] });
        }).toThrow(/Database hosts array is empty/);
    });

    test('All driver connectors build configurations correctly', () => {
        const knex = require('knex');
        const knexSpy = jest.spyOn(require('knex'), 'Client').mockImplementation(function () {
            this.initializeDriver = jest.fn();
            this.acquireConnection = jest.fn();
            this.on = jest.fn();
        });

        try {
            const _MysqlConnector = require('../src/connectors/mysqlConnector');
            const MysqlConnector = _MysqlConnector.default || _MysqlConnector;
            const _PostgresConnector = require('../src/connectors/postgresConnector');
            const PostgresConnector = _PostgresConnector.default || _PostgresConnector;
            const _OracleConnector = require('../src/connectors/oracleConnector');
            const OracleConnector = _OracleConnector.default || _OracleConnector;
            const _SqlServerConnector = require('../src/connectors/sqlServerConnector');
            const SqlServerConnector = _SqlServerConnector.default || _SqlServerConnector;

            const mysql = new MysqlConnector();
            try {
                mysql.connect({
                    port: '3306',
                    host: ['localhost'],
                    username: 'root',
                    password: 'pwd',
                    socket: '/tmp/mysql.sock',
                    useNullAsDefault: true,
                    asyncStackTraces: true
                }, 'test_db', 'prefix_');
            } catch (e) {
                // native driver may not be installed locally
            }

            const pgsql = new PostgresConnector();
            try {
                pgsql.connect({
                    port: 5432,
                    host: 'localhost',
                    username: 'postgres',
                    password: 'pwd',
                    ssl: true,
                    schema: 'public'
                }, 'test_pg', 'prefix_');
                pgsql.connect({
                    port: 5432,
                    host: 'localhost',
                    username: 'postgres',
                    password: 'pwd',
                    ssl: false,
                    schema: ['public', 'custom']
                }, 'test_pg', 'prefix_');
            } catch (e) {}

            const oracle = new OracleConnector();
            try {
                oracle.connect({
                    port: '1521',
                    host: ['localhost'],
                    username: 'system',
                    password: 'pwd'
                }, 'test_ora', 'prefix_');
            } catch (e) {}

            const sqlsrv = new SqlServerConnector();
            try {
                sqlsrv.connect({
                    port: 1433,
                    host: ['localhost'],
                    username: 'sa',
                    password: 'pwd',
                    encrypt: true
                }, 'test_sql', 'prefix_');
            } catch (e) {}
        } finally {
            knexSpy.mockRestore();
        }
    });

    test('Seeder throws InvalidArgumentException when run method is missing', () => {
        class BrokenSeeder extends Seeder {}
        const seeder = new BrokenSeeder();
        expect(() => {
            seeder.__invoke();
        }).toThrow(/Method \[run\] missing/);
    });

    test('Seeder call with single non-array class and with command output', async () => {
        const logs = [];
        const mockCommand = {
            getOutput: () => ({
                writeln: (msg) => logs.push(msg)
            })
        };

        class ValidSeeder extends Seeder {
            run() {}
        }

        const parentSeeder = new Seeder();
        parentSeeder.setCommand(mockCommand);
        await parentSeeder.call(ValidSeeder, false, []);
        expect(logs.length).toBeGreaterThanOrEqual(2);

        // Test call with array of classes
        await parentSeeder.call([ValidSeeder], false, []);
        expect(logs.length).toBeGreaterThanOrEqual(4);

        // Test callWith and callSilent
        await parentSeeder.callWith(ValidSeeder, ['arg1']);
        await parentSeeder.callSilent(ValidSeeder, ['arg2']);

        // Test container resolution in Seeder
        const mockApp = {
            make: (cls) => new cls(),
            call: ([inst, method], params) => inst[method](...params)
        };
        parentSeeder.setContainer(mockApp);
        await parentSeeder.call(ValidSeeder);
        expect(parentSeeder.$app).toBe(mockApp);

        // Test seeder $command getter when null
        const emptySeeder = new Seeder();
        expect(emptySeeder.$command).toBeNull();
        expect(emptySeeder.$command).toBeNull(); // hits truthy this[kCommand] or null
    });

    test('DatabaseManager parseConnectionName read/write, purge, reconnect default', () => {
        const [readName, readType] = db.parseConnectionName('sqlite::read');
        expect(readName).toBe('sqlite');
        expect(readType).toBe('read');

        const [writeName, writeType] = db.parseConnectionName('sqlite::write');
        expect(writeName).toBe('sqlite');
        expect(writeType).toBe('write');

        // Test configuration default
        expect(db.configuration()).toBeDefined();

        // Test purge and reconnect default connection
        db.purge();
        expect(db.getConnections()['sqlite']).toBeUndefined();

        const reconnected = db.reconnect();
        expect(reconnected).toBeDefined();

        // Reconnect when connection exists
        const reconnectedAgain = db.reconnect();
        expect(reconnectedAgain).toBeDefined();
    });

    test('ConnectionFactory createConnectionResolverWithHosts and parseHost branches', () => {
        const customFactory = new ConnectionFactory(container);

        // 1. Missing driver error
        expect(() => {
            customFactory.createConnector({});
        }).toThrow('A driver must be specified.');

        // 2. Empty hosts error
        expect(() => {
            customFactory.parseHost({ host: [] });
        }).toThrow('Database hosts array is empty.');

        // 3. createConnectionResolver with hosts returns working resolver
        const resolver = customFactory.createConnectionResolverWithHosts({
            driver: 'sqlite',
            host: '127.0.0.1'
        });
        const connInstance = resolver(':memory:', '');
        expect(connInstance).toBeDefined();
    });

    test('All driver connectors connect with various config combinations', () => {
        const mysql2 = require('knex/lib/dialects/mysql2');
        const pg = require('knex/lib/dialects/postgres');
        const oracledb = require('knex/lib/dialects/oracledb');
        const mssql = require('knex/lib/dialects/mssql');

        const origMysql = mysql2.prototype.initializeDriver;
        const origPg = pg.prototype.initializeDriver;
        const origOracle = oracledb.prototype.initializeDriver;
        const origMssql = mssql.prototype.initializeDriver;

        mysql2.prototype.initializeDriver = function() { this.driver = {}; };
        pg.prototype.initializeDriver = function() { this.driver = {}; };
        oracledb.prototype.initializeDriver = function() { this.driver = {}; };
        mssql.prototype.initializeDriver = function() { this.driver = {}; };

        try {
            const _MysqlConnector = require('../src/connectors/mysqlConnector');
            const MysqlConnector = _MysqlConnector.default || _MysqlConnector;
            const _PostgresConnector = require('../src/connectors/postgresConnector');
            const PostgresConnector = _PostgresConnector.default || _PostgresConnector;
            const _SqlServerConnector = require('../src/connectors/sqlServerConnector');
            const SqlServerConnector = _SqlServerConnector.default || _SqlServerConnector;
            const _OracleConnector = require('../src/connectors/oracleConnector');
            const OracleConnector = _OracleConnector.default || _OracleConnector;
            const _SqliteConnector = require('../src/connectors/sqliteConnector');
            const SqliteConnector = _SqliteConnector.default || _SqliteConnector;

            // MysqlConnector: test both false and default fallback
            const mysqlConn = new MysqlConnector();
            const m1 = mysqlConn.connect({
                host: ['localhost'],
                port: '3306',
                username: 'root',
                password: '',
                useNullAsDefault: false,
                asyncStackTraces: false
            }, 'test_db', 'pfx_');
            expect(m1.client.config.useNullAsDefault).toBe(false);
            expect(m1.client.config.asyncStackTraces).toBe(false);

            const m2 = mysqlConn.connect({
                host: ['localhost'],
                port: 3306,
                username: 'root',
                password: ''
            }, 'test_db', 'pfx_');
            expect(m2.client.config.useNullAsDefault).toBe(true);
            expect(m2.client.config.asyncStackTraces).toBe(true);

            // OracleConnector: test both false and default fallback
            const oracleConn = new OracleConnector();
            const o1 = oracleConn.connect({
                host: ['localhost'],
                port: '1521',
                username: 'system',
                password: 'pwd',
                useNullAsDefault: false,
                asyncStackTraces: false
            }, 'xe', '');
            expect(o1.client.config.useNullAsDefault).toBe(false);
            expect(o1.client.config.asyncStackTraces).toBe(false);

            const o2 = oracleConn.connect({
                host: ['localhost'],
                port: 1521,
                username: 'system',
                password: 'pwd'
            }, 'xe', '');
            expect(o2.client.config.useNullAsDefault).toBe(true);
            expect(o2.client.config.asyncStackTraces).toBe(true);

            // PostgresConnector: test ssl true/false, string schema / array schema, null/trace defaults
            const pgConn = new PostgresConnector();
            const p1 = pgConn.connect({
                host: 'localhost',
                port: '5432',
                username: 'postgres',
                password: '',
                ssl: true,
                schema: 'public',
                useNullAsDefault: false,
                asyncStackTraces: false
            }, 'pg_db', '');
            expect(p1.client.config.connection.ssl).toEqual({ rejectUnauthorized: false });
            expect(p1.client.config.searchPath).toEqual(['public']);
            expect(p1.client.config.useNullAsDefault).toBe(false);
            expect(p1.client.config.asyncStackTraces).toBe(false);

            const p2 = pgConn.connect({
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: '',
                ssl: false,
                schema: ['public', 'custom']
            }, 'pg_db', '');
            expect(p2.client.config.connection.ssl).toBe(false);
            expect(p2.client.config.searchPath).toEqual(['public', 'custom']);
            expect(p2.client.config.useNullAsDefault).toBe(true);
            expect(p2.client.config.asyncStackTraces).toBe(true);

            // SqlServerConnector: test encrypt true/false, null/trace defaults
            const sqlsrvConn = new SqlServerConnector();
            const s1 = sqlsrvConn.connect({
                host: ['localhost'],
                port: '1433',
                username: 'sa',
                password: 'pwd',
                encrypt: true,
                useNullAsDefault: false,
                asyncStackTraces: false
            }, 'master', '');
            expect(s1.client.config.connection.options.encrypt).toBe(true);
            expect(s1.client.config.useNullAsDefault).toBe(false);
            expect(s1.client.config.asyncStackTraces).toBe(false);

            const s2 = sqlsrvConn.connect({
                host: ['localhost'],
                port: 1433,
                username: 'sa',
                password: 'pwd',
                encrypt: false
            }, 'master', '');
            expect(s2.client.config.connection.options.encrypt).toBe(false);
            expect(s2.client.config.useNullAsDefault).toBe(true);
            expect(s2.client.config.asyncStackTraces).toBe(true);

            // SqliteConnector: pool afterCreate, foreign_key_constraints true/false, client version
            const sqliteConn = new SqliteConnector();
            const sq1 = sqliteConn.connect({
                foreign_key_constraints: false,
                useNullAsDefault: false,
                asyncStackTraces: false
            }, ':memory:', '');
            expect(sq1.client.config.client).toBe('sqlite3');
            expect(sq1.client.config.useNullAsDefault).toBe(false);
            expect(sq1.client.config.asyncStackTraces).toBe(false);

            const fakeConn = {
                run: jest.fn((sql, cb) => cb && cb())
            };
            let doneCalled = false;
            sq1.client.config.pool.afterCreate(fakeConn, () => { doneCalled = true; });
            expect(fakeConn.run).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF;', expect.any(Function));
            expect(doneCalled).toBe(true);

            // Stub better-sqlite3 dialect before connecting
            const betterSqlite = require('knex/lib/dialects/better-sqlite3');
            const origBetterSqlite = betterSqlite.prototype.initializeDriver;
            betterSqlite.prototype.initializeDriver = function() { this.driver = {}; };

            try {
                const sq2 = sqliteConn.connect({
                    version: 'better-sqlite3',
                    foreign_key_constraints: true
                }, ':memory:', '');
                expect(sq2.client.config.client).toBe('better-sqlite3');
                expect(sq2.client.config.useNullAsDefault).toBe(true);
                expect(sq2.client.config.asyncStackTraces).toBe(true);
                sq2.client.config.pool.afterCreate(fakeConn, () => {});
                expect(fakeConn.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;', expect.any(Function));
            } finally {
                betterSqlite.prototype.initializeDriver = origBetterSqlite;
            }

            // Test ConnectionFactory.createConnection unsupported driver branch (line 133)
            expect(() => {
                factory.createConnection('invalid_driver_test', {}, 'test_db');
            }).toThrow(/Unsupported driver/);
        } finally {
            mysql2.prototype.initializeDriver = origMysql;
            pg.prototype.initializeDriver = origPg;
            oracledb.prototype.initializeDriver = origOracle;
            mssql.prototype.initializeDriver = origMssql;
        }
    });
});
