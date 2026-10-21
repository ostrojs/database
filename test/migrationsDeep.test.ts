'use strict';

const { createDatabaseManager } = require('./setup');
const _DatabaseMigrationRepository = require('../src/migrations/databaseMigrationRepository');
const DatabaseMigrationRepository = _DatabaseMigrationRepository.default || _DatabaseMigrationRepository;
const _Migrator = require('../src/migrations/migrator');
const Migrator = _Migrator.default || _Migrator;
const path = require('path');
const fs = require('fs');

describe('Migrations & Repository Deep Tests', () => {

    let db;
    let repository;
    let migrator;

    beforeEach(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        repository = new DatabaseMigrationRepository(db, 'deep_migrations');
        await repository.createRepository();
        migrator = new Migrator(repository, db, {
            glob: (pattern) => Promise.resolve([])
        });
    });

    afterEach(async () => {
        if (await repository.repositoryExists()) {
            await repository.deleteRepository();
        }
        db.disconnect();
    });

    test('getMigrations($steps) fetches specified number of migrations', async () => {
        await repository.log('m1.js', 1);
        await repository.log('m2.js', 1);
        await repository.log('m3.js', 2);

        const last2 = await repository.getMigrations(2);
        expect(last2.length).toBe(2);
        expect(last2[0].migration).toBe('m3.js');

        // Test getRan
        const ran = await repository.getRan();
        expect(ran).toContain('m1.js');

        // Test getNextBatchNumber
        const nextBatch = await repository.getNextBatchNumber();
        expect(nextBatch).toBe(3);

        // Test delete
        await repository.delete({ migration: 'm1.js' });
        const ranAfterDelete = await repository.getRan();
        expect(ranAfterDelete).not.toContain('m1.js');
    });

    test('getMigrationBatches returns ordered pluck of batch and migration', async () => {
        await repository.log('2026_01_01_create_a.js', 1);
        await repository.log('2026_01_02_create_b.js', 2);

        const batches = await repository.getMigrationBatches();
        expect(batches).toBeDefined();

        // Test getLastBatchNumber when res is empty or null
        const origTable = repository.table;
        try {
            repository.table = () => ({
                max: () => Promise.resolve([])
            });
            expect(await repository.getLastBatchNumber()).toBe(0);

            repository.table = () => ({
                max: () => Promise.resolve(null)
            });
            expect(await repository.getLastBatchNumber()).toBe(0);
        } finally {
            repository.table = origTable;
        }
    });

    test('setSource sets active migration repository connection', () => {
        repository.setSource('sqlite_secondary');
        expect(repository.$connection).toBe('sqlite_secondary');
        repository.setSource(null);
    });

    test('migrator.requireFiles and migrator.paths', async () => {
        migrator.$paths.push('/custom/migrations/path');
        expect(migrator.paths()).toContain('/custom/migrations/path');

        // Test requireFiles with temp file
        const tmpFile = path.join(__dirname, 'tmp_migration_test.txt');
        fs.writeFileSync(tmpFile, 'test migration file content');
        try {
            const results = await migrator.requireFiles([tmpFile]);
            expect(results.length).toBe(1);
            expect(results[0].status).toBe('fulfilled');
            expect(results[0].value).toContain('test migration file content');
        } finally {
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
        }
    });

    test('migrator.rollback with steps when repository is empty or has steps', async () => {
        const rolledBack = await migrator.rollback();
        expect(Array.isArray(rolledBack)).toBe(true);
        expect(rolledBack.length).toBe(0);

        // Test migrator.resolve and getMigrationClass
        expect(migrator.getMigrationClass('2026_01_01_test')).toBeUndefined();
        migrator.getMigrationClass = () => class CustomMigration {};
        const instance = migrator.resolve('2026_01_01_test');
        expect(instance).toBeDefined();

        // Test migrator setOutput, note, pretendToRun
        const logs = [];
        const mockOutput = {
            writeln: (msg) => logs.push(msg)
        };
        migrator.setOutput(mockOutput);
        migrator.note('Test Note');
        expect(logs).toContain('Test Note');

        // Test pretendToRun success path
        const origGetQueries = migrator.getQueries;
        const mockMigration = {
            getConnection: () => null,
            up: () => {}
        };
        migrator.getQueries = () => Promise.resolve([{ query: 'CREATE TABLE dummy (id INT)' }]);
        await migrator.pretendToRun(mockMigration, 'up');
        expect(logs.some(l => l.includes('CREATE TABLE dummy'))).toBe(true);

        // Test pretendToRun catch error path
        migrator.getQueries = () => { throw new Error('pretend failed'); };
        await migrator.pretendToRun(mockMigration, 'up');
        expect(logs.some(l => l.includes('failed to dump queries'))).toBe(true);
        migrator.getQueries = origGetQueries;

        // Test getQueries
        migrator.resolveConnection = () => ({
            pretend: (cb) => { cb(); return ['PRETEND_QUERY']; }
        });
        const queries = await migrator.getQueries({
            getConnection: () => null,
            up: () => {}
        }, 'up');
        expect(queries).toEqual(['PRETEND_QUERY']);
    });

    test('migrator rollback edge cases and reset branches', async () => {
        const logs = [];
        const mockOutput = {
            write: (msg) => logs.push(msg),
            writeln: (msg) => logs.push(msg)
        };
        const mockRepo = {
            getMigrations: jest.fn().mockResolvedValue([{ migration: 'mig1' }, { migration: 'mig2' }]),
            getLast: jest.fn().mockResolvedValue([{ migration: 'mig_last' }]),
            getRan: jest.fn().mockResolvedValue(['2023_01_01_mig1', '2023_01_02_mig2']),
            delete: jest.fn().mockResolvedValue(true)
        };
        const mockResolver = {
            connection: jest.fn().mockReturnValue({
                pretend: (cb) => { cb(); return []; },
                getSchemaBuilder: () => ({})
            })
        };
        const migrator = new Migrator(mockRepo, mockResolver, {});
        migrator.setOutput(mockOutput);

        // 1. getMigrationsForRollback with step > 0
        const rollbackList = await migrator.getMigrationsForRollback({ step: 2 });
        expect(rollbackList).toEqual([{ migration: 'mig1' }, { migration: 'mig2' }]);
        expect(mockRepo.getMigrations).toHaveBeenCalledWith(2);

        // 2. rollbackMigrations where a file is NOT found
        migrator.getMigrationFiles = async () => ['/path/to/2023_01_01_mig1.js'];
        migrator.getMigrationName = (p) => p.includes('mig1') ? 'mig1' : 'other';
        const origRunDown = migrator.runDown;
        migrator.runDown = jest.fn().mockResolvedValue(true);

        const rolledBack = await migrator.rollbackMigrations(
            [{ migration: 'mig1' }, { migration: 'mig_missing' }],
            ['/path'],
            { pretend: true }
        );
        expect(rolledBack).toEqual(['/path/to/2023_01_01_mig1.js']);
        expect(logs.some(l => l.includes('<fg=red>Migration not found:</> mig_missing'))).toBe(true);
        expect(migrator.runDown).toHaveBeenCalledWith(
            '/path/to/2023_01_01_mig1.js',
            { migration: 'mig1' },
            true
        );

        // 3. runDown with pretend: true
        migrator.runDown = origRunDown;
        migrator.resolvePath = () => ({
            getConnection: () => null,
            down: () => {}
        });
        migrator.pretendToRun = jest.fn().mockResolvedValue(true);
        await migrator.runDown('/path/to/2023_01_01_mig1.js', { migration: 'mig1' }, true);
        expect(migrator.pretendToRun).toHaveBeenCalled();

        // 4. reset when getRan is empty
        mockRepo.getRan.mockResolvedValueOnce([]);
        const emptyReset = await migrator.reset();
        expect(emptyReset).toEqual([]);
        expect(logs.some(l => l.includes('Nothing to rollback.'))).toBe(true);

        // 5. reset when getRan has migrations
        mockRepo.getRan.mockResolvedValueOnce(['mig1']);
        migrator.resetMigrations = jest.fn().mockResolvedValue(['mig1']);
        const resReset = await migrator.reset();
        expect(resReset).toEqual(['mig1']);

        // 6. runPending with empty migrations
        await migrator.runPending([]);
        expect(logs.some(l => l.includes('Nothing to migrate.'))).toBe(true);

        // 7. pendingMigrations with matching ran migration
        migrator.getMigrationName = (p) => 'mig1';
        const pending = migrator.pendingMigrations(['/path/to/mig1.js'], ['mig1']);
        expect(pending).toEqual([]);

        // 8. runPending with step: true and pretend: true
        let batchAssigned = [];
        mockRepo.getNextBatchNumber = jest.fn().mockResolvedValue(5);
        migrator.runUp = jest.fn().mockImplementation(async (file, batch, pretend) => {
            batchAssigned.push({ file, batch, pretend });
        });
        await migrator.runPending(['mig_file1.js', 'mig_file2.js'], { step: true, pretend: true });
        expect(batchAssigned).toEqual([
            { file: 'mig_file1.js', batch: 5, pretend: true },
            { file: 'mig_file2.js', batch: 6, pretend: true }
        ]);

        // 9. runUp with pretend: true calling real runUp
        migrator.runUp = Migrator.prototype.runUp;
        migrator.pretendToRun = jest.fn().mockResolvedValue(true);
        await migrator.runUp('/path/to/mig1.js', 1, true);
        expect(migrator.pretendToRun).toHaveBeenCalledWith(expect.anything(), 'up');

        // 10. runMigration branches: getConnection null, no method, with method
        await migrator.runMigration({}, 'nonExistentMethod');
        await migrator.runMigration({ getConnection: () => null, up: jest.fn() }, 'up');
        migrator.resolveConnection = () => null;
        await migrator.runMigration({ getConnection: () => 'fake_conn', up: jest.fn() }, 'up');

        // 11. resolve() branch when $class is class/function vs object
        migrator.getMigrationClass = () => class TestMig {};
        const inst = migrator.resolve('dummy');
        expect(typeof inst).toBe('object');
        migrator.getMigrationClass = () => ({ obj: 1 });
        expect(migrator.resolve('dummy')).toEqual({ obj: 1 });

        // 12. resolvePath branch when exported is an object vs class/function
        const tmpDir = path.join(__dirname, 'tmp_mig_test');
        fs.mkdirSync(tmpDir, { recursive: true });
        const objMigPath = path.join(tmpDir, 'obj_migration.js');
        fs.writeFileSync(objMigPath, 'module.exports = { isObject: true };');
        const resolvedObj = Migrator.prototype.resolvePath.call(migrator, objMigPath);
        expect(resolvedObj.isObject).toBe(true);
        fs.rmSync(tmpDir, { recursive: true, force: true });

        // 13. getMigrationFiles directly with .js file path
        const directFiles = await Migrator.prototype.getMigrationFiles.call(migrator, ['/test/path/2023_01_01_sample.js']);
        expect(directFiles).toEqual(['/test/path/2023_01_01_sample.js']);
    });
});
