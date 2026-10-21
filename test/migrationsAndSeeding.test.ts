import { createDatabaseManager } from './setup';
import DatabaseMigrationRepository from '../src/migrations/databaseMigrationRepository';
import Migrator from '../src/migrations/migrator';
import Migration from '../src/migration';
import Seeder from '../src/seeder';
import fs from 'fs-extra';
import path from 'path';

describe('Database Migrations and Seeding Comprehensive Unit Tests', () => {

    let db;
    let conn;
    let schema;
    let repository;
    let testMigrationDir;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');
        schema = conn.getSchemaBuilder();
        testMigrationDir = path.join(__dirname, '../temp_migrations');
        await fs.ensureDir(testMigrationDir);
    });

    afterAll(async () => {
        await fs.remove(testMigrationDir);
        db.disconnect();
    });

    beforeEach(async () => {
        await schema.dropTableIfExists('migrations');
        await schema.dropTableIfExists('test_users');
        await schema.dropTableIfExists('test_products');
        await fs.emptyDir(testMigrationDir);
        repository = new DatabaseMigrationRepository(db, 'migrations');
    });

    describe('DatabaseMigrationRepository', () => {
        test('createRepository, repositoryExists, and deleteRepository work correctly', async () => {
            expect(await repository.repositoryExists()).toBe(false);

            await repository.createRepository();
            expect(await repository.repositoryExists()).toBe(true);

            await repository.deleteRepository();
            expect(await repository.repositoryExists()).toBe(false);
        });

        test('log, getRan, getLastBatchNumber, getNextBatchNumber, getLast, and delete', async () => {
            await repository.createRepository();

            expect(await repository.getLastBatchNumber()).toBe(0);
            expect(await repository.getNextBatchNumber()).toBe(1);

            // Log batch 1
            await repository.log('2026_01_01_000001_create_users_table.js', 1);
            await repository.log('2026_01_01_000002_create_posts_table.js', 1);

            expect(await repository.getLastBatchNumber()).toBe(1);
            expect(await repository.getNextBatchNumber()).toBe(2);

            let ran = await repository.getRan();
            let ranList = Array.isArray(ran) ? ran : ran.all();
            expect(ranList).toHaveLength(2);
            expect(ranList).toContain('2026_01_01_000001_create_users_table.js');
            expect(ranList).toContain('2026_01_01_000002_create_posts_table.js');

            // Log batch 2
            await repository.log('2026_01_02_000001_create_comments_table.js', 2);
            expect(await repository.getLastBatchNumber()).toBe(2);
            expect(await repository.getNextBatchNumber()).toBe(3);

            let last = await repository.getLast();
            let lastList = Array.isArray(last) ? last : last.all();
            expect(lastList).toHaveLength(1);
            expect(lastList[0].migration).toBe('2026_01_02_000001_create_comments_table.js');

            // Delete record
            await repository.delete({ migration: '2026_01_02_000001_create_comments_table.js' });
            expect(await repository.getLastBatchNumber()).toBe(1);
        });
    });

    describe('Migrator Lifecycle (run, rollback, reset)', () => {
        let migrator;

        const fakeFiles = {
            glob: async (pattern) => {
                const rawDir = pattern.split('*')[0].replace(/[/\\]+$/, '');
                if (!await fs.pathExists(rawDir)) return [];
                const files = await fs.readdir(rawDir);
                return files.filter(f => f.endsWith('.js')).map(f => path.join(rawDir, f));
            },
            exists: async (p) => fs.pathExists(p),
            get: async (p) => fs.readFile(p, 'utf8'),
            put: async (p, content) => fs.writeFile(p, content),
            ensureDirectoryExists: async (p) => fs.ensureDir(p),
        };

        beforeEach(async () => {
            await repository.createRepository();
            migrator = new Migrator(repository, db, fakeFiles);
        });

        test('runs pending migrations and updates database schema', async () => {
            const m1Path = path.join(testMigrationDir, '2026_01_01_000001_create_test_users.js');
            await fs.writeFile(m1Path, `
                const _Migration = require('../src/migration');
                const Migration = _Migration.default || _Migration;
                class CreateTestUsers extends Migration {
                    async up(schema) {
                        await schema.createTable('test_users', (t) => {
                            t.increments('id');
                            t.string('name');
                        });
                    }
                    async down(schema) {
                        await schema.dropTableIfExists('test_users');
                    }
                }
                module.exports = CreateTestUsers;
            `);

            await migrator.run([testMigrationDir]);

            expect(await schema.hasTable('test_users')).toBe(true);
            const ran = await repository.getRan();
            const ranList = Array.isArray(ran) ? ran : ran.all();
            expect(ranList).toHaveLength(1);
            expect(ranList[0]).toBe('2026_01_01_000001_create_test_users.js');
        });

        test('rollbacks last batch of migrations', async () => {
            const m1Path = path.join(testMigrationDir, '2026_01_01_000001_create_test_users.js');
            await fs.writeFile(m1Path, `
                const _Migration = require('../src/migration');
                const Migration = _Migration.default || _Migration;
                class CreateTestUsers extends Migration {
                    async up(schema) {
                        await schema.createTable('test_users', (t) => {
                            t.increments('id');
                            t.string('name');
                        });
                    }
                    async down(schema) {
                        await schema.dropTableIfExists('test_users');
                    }
                }
                module.exports = CreateTestUsers;
            `);

            await migrator.run([testMigrationDir]);
            expect(await schema.hasTable('test_users')).toBe(true);

            // Rollback
            await migrator.rollback([testMigrationDir]);
            expect(await schema.hasTable('test_users')).toBe(false);
            const ran = await repository.getRan();
            const ranList = Array.isArray(ran) ? ran : ran.all();
            expect(ranList).toHaveLength(0);
        });

        test('resets all executed migrations', async () => {
            const m1Path = path.join(testMigrationDir, '2026_01_01_000001_create_test_users.js');
            const m2Path = path.join(testMigrationDir, '2026_01_02_000002_create_test_products.js');

            await fs.writeFile(m1Path, `
                const _Migration = require('../src/migration');
                const Migration = _Migration.default || _Migration;
                class CreateTestUsers extends Migration {
                    async up(schema) {
                        await schema.createTable('test_users', (t) => {
                            t.increments('id');
                        });
                    }
                    async down(schema) {
                        await schema.dropTableIfExists('test_users');
                    }
                }
                module.exports = CreateTestUsers;
            `);

            await fs.writeFile(m2Path, `
                const _Migration = require('../src/migration');
                const Migration = _Migration.default || _Migration;
                class CreateTestProducts extends Migration {
                    async up(schema) {
                        await schema.createTable('test_products', (t) => {
                            t.increments('id');
                        });
                    }
                    async down(schema) {
                        await schema.dropTableIfExists('test_products');
                    }
                }
                module.exports = CreateTestProducts;
            `);

            await migrator.run([testMigrationDir]);
            expect(await schema.hasTable('test_users')).toBe(true);
            expect(await schema.hasTable('test_products')).toBe(true);

            await migrator.reset([testMigrationDir]);
            expect(await schema.hasTable('test_users')).toBe(false);
            expect(await schema.hasTable('test_products')).toBe(false);
            const ran = await repository.getRan();
            const ranList = Array.isArray(ran) ? ran : ran.all();
            expect(ranList).toHaveLength(0);
        });

        test('Migrator repository and connection helper methods', async () => {
            expect(await migrator.repositoryExists()).toBe(true);
            const ranAny = await migrator.hasRunAnyMigrations();
            expect(ranAny).toBeDefined();

            migrator.setConnection('sqlite');
            expect(migrator.getConnection()).toBe('sqlite');
            const resolved = await migrator.usingConnection('sqlite');
            expect(resolved).toBeDefined();
            expect(migrator.getRepository()).toBe(repository);
            expect(migrator.getFilesystem()).toBe(fakeFiles);

            const notes = [];
            migrator.setOutput({ writeln: (msg) => notes.push(msg) });
            migrator.note('Test Note');
            expect(notes).toContain('Test Note');

            await migrator.deleteRepository();
            expect(await migrator.repositoryExists()).toBe(false);
        });
    });

    describe('Database Seeder', () => {
        beforeEach(async () => {
            await schema.createTable('test_users', (t) => {
                t.increments('id');
                t.string('name');
                t.string('role');
            });
        });

        test('executes seeder class and inserts records', async () => {
            class UserSeeder extends Seeder {
                async run() {
                    const c = db.connection('sqlite');
                    await c.table('test_users').insert([
                        { name: 'Admin User', role: 'admin' },
                        { name: 'Regular User', role: 'user' },
                    ]);
                }
            }

            const seeder = new Seeder(db);
            await seeder.call(UserSeeder);

            const users = await conn.table('test_users').get();
            const userList = Array.isArray(users) ? users : users.all();
            expect(userList).toHaveLength(2);
            expect(userList[0].name).toBe('Admin User');
            expect(userList[1].name).toBe('Regular User');
        });

        test('callWith passes parameters to seeder run method', async () => {
            class ParameterizedSeeder extends Seeder {
                async run(customName, customRole) {
                    const c = db.connection('sqlite');
                    await c.table('test_users').insert({
                        name: customName,
                        role: customRole,
                    });
                }
            }

            const seeder = new Seeder(db);
            await seeder.callWith(ParameterizedSeeder, ['Custom Superuser', 'root']);

            const user = await conn.table('test_users').first();
            expect(user.name).toBe('Custom Superuser');
            expect(user.role).toBe('root');
        });

        test('callSilent runs seeder without command output', async () => {
            class SilentSeeder extends Seeder {
                async run() {
                    const c = db.connection('sqlite');
                    await c.table('test_users').insert({
                        name: 'Silent User',
                        role: 'guest',
                    });
                }
            }

            const seeder = new Seeder(db);
            await seeder.callSilent(SilentSeeder);

            const user = await conn.table('test_users').first();
            expect(user.name).toBe('Silent User');
        });

        test('Migration base class methods up, down, getConnection', () => {
            const m = new Migration();
            expect(m.getConnection()).toBeNull();
            expect(m.up()).toBeUndefined();
            expect(m.down()).toBeUndefined();
        });

        test('Seeder with command and container outputs formatted progress', async () => {
            const written = [];
            const fakeCommand = {
                getOutput() {
                    return {
                        writeln(str) { written.push(str); }
                    };
                }
            };
            const fakeApp = {
                make(cls) { return new cls(); },
                call([instance, method], params) { return instance[method](...params); }
            };

            class OutputSeeder extends Seeder {
                async run() {
                    const c = db.connection('sqlite');
                    await c.table('test_users').insert({ name: 'Outputted', role: 'admin' });
                }
            }

            const seeder = new Seeder(db);
            seeder.setCommand(fakeCommand);
            seeder.setContainer(fakeApp);
            expect(seeder.$command).toBe(fakeCommand);

            await seeder.call(OutputSeeder);
            expect(written.length).toBeGreaterThanOrEqual(2);
            expect(written[0]).toContain('Seeding:');
            expect(written[1]).toContain('Seeded:');

            // callWith test with default and explicit parameters
            await seeder.callWith(OutputSeeder);
            await seeder.callWith(OutputSeeder, ['param1']);
        });
    });

});
