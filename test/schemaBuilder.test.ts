const { createDatabaseManager } = require('./setup');

describe('Schema Builder Comprehensive Unit Tests', () => {

    let db;
    let conn;
    let schema;

    beforeEach(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');
        schema = conn.getSchemaBuilder();
    });

    afterEach(async () => {
        db.disconnect();
    });

    test('createTable() creates new table with various column types and modifiers', async () => {
        await schema.dropTableIfExists('test_schema_table');

        await schema.createTable('test_schema_table', (table) => {
            table.increments('id').primary();
            table.string('title', 150).notNullable();
            table.text('body').nullable();
            table.integer('views').defaultTo(0);
            table.boolean('is_published').defaultTo(false);
            table.decimal('price', 8, 2).nullable();
            table.json('metadata').nullable();
            table.timestamps();
        });

        const exists = await schema.hasTable('test_schema_table');
        expect(exists).toBe(true);
    });

    test('hasTable() and has() check table existence correctly', async () => {
        expect(await schema.hasTable('non_existent_table_xyz')).toBe(false);
        expect(await schema.has('non_existent_table_xyz')).toBe(false);

        await schema.createTable('temp_check_table', (t) => {
            t.increments('id');
        });

        expect(await schema.hasTable('temp_check_table')).toBe(true);
        expect(await schema.has('temp_check_table')).toBe(true);

        await schema.dropTable('temp_check_table');
        expect(await schema.hasTable('temp_check_table')).toBe(false);
    });

    test('dropTableIfExists() and dropTable() drop tables safely', async () => {
        await schema.createTable('drop_me_table', (t) => {
            t.increments('id');
        });

        expect(await schema.hasTable('drop_me_table')).toBe(true);
        await schema.dropTableIfExists('drop_me_table');
        expect(await schema.hasTable('drop_me_table')).toBe(false);

        // Dropping non-existent table with dropTableIfExists should not throw
        await expect(schema.dropTableIfExists('drop_me_table')).resolves.not.toThrow();
    });

    test('renameTable() renames an existing table', async () => {
        await schema.dropTableIfExists('old_name_table');
        await schema.dropTableIfExists('new_name_table');

        await schema.createTable('old_name_table', (t) => {
            t.increments('id');
        });

        await schema.renameTable('old_name_table', 'new_name_table');
        expect(await schema.hasTable('old_name_table')).toBe(false);
        expect(await schema.hasTable('new_name_table')).toBe(true);

        await schema.dropTable('new_name_table');
    });

    test('getAllTables() and dropAllTables() manage all database tables in sqlite', async () => {
        await schema.createTable('bulk_table_1', (t) => t.increments('id'));
        await schema.createTable('bulk_table_2', (t) => t.increments('id'));

        const tables = await schema.getAllTables();
        expect(tables).toContain('bulk_table_1');
        expect(tables).toContain('bulk_table_2');

        await schema.dropAllTables();
        expect(await schema.hasTable('bulk_table_1')).toBe(false);
        expect(await schema.hasTable('bulk_table_2')).toBe(false);

        // Test with PRAGMA foreign_keys = ON
        await schema.createTable('bulk_table_fk', (t) => t.increments('id'));
        await schema.statement('PRAGMA foreign_keys = ON;');
        await schema.dropAllTables();
        expect(await schema.hasTable('bulk_table_fk')).toBe(false);

        // Test sqliteBuilder dropAllTables branch when foreign_key is empty array or non-array
        const origStatement = schema.statement;
        try {
            schema.getAllTables = () => Promise.resolve(['mock_t1']);
            schema.dropTableIfExists = () => Promise.resolve();
            schema.statement = (sql) => {
                if (sql.includes('PRAGMA foreign_keys;')) {
                    return Promise.resolve([]);
                }
                return Promise.resolve();
            };
            await schema.dropAllTables();

            schema.statement = (sql) => {
                if (sql.includes('PRAGMA foreign_keys;')) {
                    return Promise.resolve(null);
                }
                return Promise.resolve();
            };
            await schema.dropAllTables();
        } finally {
            schema.statement = origStatement;
        }
    });

    test('Unsupported methods throw LogicException with clear messages', async () => {
        expect(() => schema.createDatabase()).toThrow('does not support creating databases');
        expect(() => schema.dropDatabaseIfExists()).toThrow('does not support dropping databases');
        expect(() => schema.getTypes()).toThrow('does not support user-defined types');
        expect(() => schema.dropAllViews()).toThrow('does not support dropping all views');
        expect(() => schema.dropAllTypes()).toThrow('does not support dropping all types');

        const _BaseSchemaBuilder = require('../src/schema/builder');

        const BaseSchemaBuilder = _BaseSchemaBuilder.default || _BaseSchemaBuilder;
        const baseBuilder = new BaseSchemaBuilder(conn);
        expect(() => baseBuilder.getAllTables()).toThrow('does not support getting all tables');
        expect(() => baseBuilder.dropAllTables()).toThrow('does not support dropping all tables');

        // Test proxy schema delegates
        const calls = [];
        const mockSchema = {
            createTable: (...a) => calls.push('createTable'),
            createTableIfNotExists: (...a) => calls.push('createTableIfNotExists'),
            table: (...a) => calls.push('table'),
            hasTable: (...a) => Promise.resolve(false),
            alterTable: (...a) => calls.push('alterTable'),
            raw: (...a) => calls.push('raw'),
            createView: (...a) => calls.push('createView'),
            renameView: (...a) => calls.push('renameView'),
            dropSchema: (...a) => calls.push('dropSchema'),
            dropSchemaIfExists: (...a) => calls.push('dropSchemaIfExists'),
            dropView: (...a) => calls.push('dropView'),
            dropViewIfExists: (...a) => calls.push('dropViewIfExists'),
            dropMaterializedView: (...a) => calls.push('dropMaterializedView'),
            dropTable: (...a) => calls.push('dropTable'),
            dropTableIfExists: (...a) => calls.push('dropTableIfExists'),
            renameTable: (...a) => calls.push('renameTable'),
        };
        const mockConnection = {
            getSchemaGrammar: () => null,
            $connection: { schema: mockSchema }
        };
        const builderWithMock = new BaseSchemaBuilder(mockConnection);
        builderWithMock.createTable('t1');
        builderWithMock.createTableIfNotExists('t1');
        builderWithMock.table('t1');
        builderWithMock.alter('t1');
        builderWithMock.raw('select 1');
        builderWithMock.statement('select 1');
        builderWithMock.drop('t1');
        builderWithMock.dropIfExists('t1');
        builderWithMock.renameTable('old_name', 'new_name');
        builderWithMock.createView();
        builderWithMock.renameView();
        builderWithMock.alterView();
        builderWithMock.dropSchema();
        builderWithMock.dropSchemaIfExists();
        builderWithMock.dropView();
        builderWithMock.dropViewIfExists();
        builderWithMock.dropMaterializedView();
        expect(calls).toContain('createView');
        expect(calls).toContain('dropSchema');
        expect(calls).toContain('dropMaterializedView');
        expect(calls).toContain('createTableIfNotExists');
        expect(calls).toContain('alterTable');
        expect(calls).toContain('statement' in mockSchema ? 'statement' : 'raw');

        // Test create(table, cb)
        await builderWithMock.create('table_new', () => {});
        mockSchema.hasTable = () => Promise.resolve(true);
        await builderWithMock.create('table_existing', () => {});
    });

    test('SqliteGrammar compileDropAllTables outputs drop table statements', () => {
        const _SqliteGrammar = require('../src/schema/grammars/sqliteGrammar');
        const SqliteGrammar = _SqliteGrammar.default || _SqliteGrammar;
        const grammar = new SqliteGrammar();
        const sql = grammar.compileDropAllTables(['table1', 'table2']);
        expect(sql).toContain('DROP TABLE IF EXISTS table1;');
        expect(sql).toContain('DROP TABLE IF EXISTS table2;');

        const _SqlServerGrammar = require('../src/schema/grammars/sqlServerGrammar');

        const SqlServerGrammar = _SqlServerGrammar.default || _SqlServerGrammar;
        const ssg = new SqlServerGrammar();
        expect(ssg.compileDropAllForeignKeys()).toContain('sys.foreign_keys');
        expect(ssg.compileDropAllTables()).toContain('sys.tables');
    });

    test('MysqlBuilder, OracleBuilder, PostgresBuilder, and SqlServerBuilder dropAllTables', async () => {
        const statements = [];
        const mockConn = {
            table: (tbl) => ({
                where: () => ({
                    where: () => ({
                        pluck: () => Promise.resolve(['table_a', 'table_b'])
                    }),
                    pluck: () => Promise.resolve(['table_a'])
                }),
                pluck: () => Promise.resolve(['table_a']),
                select: () => ({
                    where: () => ({
                        pluck: () => Promise.resolve(['table_a'])
                    })
                })
            }),
            getConfig: () => 'test_db',
            getSchemaGrammar: () => null,
            select: () => Promise.resolve([{ typname: 'custom_type' }]),
            $connection: {
                schema: {}
            }
        };

        const _MysqlBuilder = require('../src/schema/mysqlBuilder');

        const MysqlBuilder = _MysqlBuilder.default || _MysqlBuilder;
        const mb = new MysqlBuilder(mockConn);
        mb.statement = (sql) => statements.push(sql);
        mb.$grammar = new ((require("../src/schema/grammars/mysqlGrammar").default || require("../src/schema/grammars/mysqlGrammar")))();
        await mb.dropAllTables();

        const _OracleBuilder = require('../src/schema/oracleBuilder');

        const OracleBuilder = _OracleBuilder.default || _OracleBuilder;
        const ob = new OracleBuilder(mockConn);
        ob.statement = (sql) => statements.push(sql);
        ob.dropIfExists = (tbl) => statements.push(`drop ${tbl}`);
        ob.$grammar = new ((require("../src/schema/grammars/oracleGrammar").default || require("../src/schema/grammars/oracleGrammar")))();
        await ob.dropAllTables();

        const _SqlServerBuilder = require('../src/schema/sqlServerBuilder');

        const SqlServerBuilder = _SqlServerBuilder.default || _SqlServerBuilder;
        const ssb = new SqlServerBuilder(mockConn);
        ssb.statement = (sql) => statements.push(sql);
        ssb.$grammar = new ((require("../src/schema/grammars/sqlServerGrammar").default || require("../src/schema/grammars/sqlServerGrammar")))();
        await ssb.dropAllTables();

        const _PostgresBuilder = require('../src/schema/postgresBuilder');

        const PostgresBuilder = _PostgresBuilder.default || _PostgresBuilder;
        const pb = new PostgresBuilder(mockConn);
        pb.statement = (sql) => statements.push(sql);
        pb.raw = (sql) => {
            statements.push(sql);
            return Promise.resolve({
                rows: [
                    { implicit: false, schema: 'test_db', type: 'domain', name: 'dom1' },
                    { implicit: false, schema: 'test_db', type: 'enum', name: 'enum1' },
                ]
            });
        };
        pb.$grammar = new ((require("../src/schema/grammars/postgresGrammar").default || require("../src/schema/grammars/postgresGrammar")))();
        await pb.dropAllTables();
        await pb.compileGetTypes();
        await pb.dropAllTypes();

        // Test mysqlBuilder with empty tables
        mb.getAllTables = () => Promise.resolve([]);
        await mb.dropAllTables();

        // Test sqliteBuilder with empty tables
        const _SqliteBuilder = require('../src/schema/sqliteBuilder');
        const SqliteBuilder = _SqliteBuilder.default || _SqliteBuilder;
        const sbEmpty = new SqliteBuilder(mockConn);
        sbEmpty.getAllTables = () => Promise.resolve([]);
        await sbEmpty.dropAllTables();

        // Test postgresBuilder with only domains, only types, and empty types
        pb.compileGetTypes = () => Promise.resolve({
            rows: [
                { implicit: false, schema: 'test_db', type: 'domain', name: 'domOnly' },
                { implicit: true, schema: 'test_db', type: 'other', name: 'ignored' },
                { implicit: false, schema: 'different_schema', type: 'other', name: 'diff' }
            ]
        });
        await pb.dropAllTypes();

        pb.compileGetTypes = () => Promise.resolve({
            rows: [
                { implicit: false, schema: 'test_db', type: 'enum', name: 'enumOnly' }
            ]
        });
        await pb.dropAllTypes();

        pb.compileGetTypes = () => Promise.resolve({ rows: [] });
        await pb.dropAllTypes();

        expect(statements.length).toBeGreaterThanOrEqual(4);
    });

});
