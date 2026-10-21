const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _BelongsToMany = require('../src/eloquent/relations/belongsToMany');
const BelongsToMany = _BelongsToMany.default || _BelongsToMany;
const _Pivot = require('../src/eloquent/relations/pivot');
const Pivot = _Pivot.default || _Pivot;
const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;

class User extends Model {
    $table = 'users_b2m';
    $fillable = ['country_id', 'name', 'email'];

    roles() {
        return this.belongsToMany(Role, 'role_user_b2m', 'user_id', 'role_id');
    }
}

class Role extends Model {
    $table = 'roles_b2m';
    $fillable = ['name'];

    users() {
        return this.belongsToMany(User, 'role_user_b2m', 'role_id', 'user_id');
    }

    newPivot(parent, attrs, table, exists, using) {
        if (using) {
            const inst = new using(attrs);
            inst.setTable(table);
            inst.setPivotKeys('user_id', 'role_id');
            return inst;
        }
        const obj = {
            attributes: attrs,
            parent,
            table,
            exists,
            using,
            setPivotKeys: (f, r) => {
                obj.foreignKey = f;
                obj.relatedKey = r;
                return obj;
            },
            fill: (a) => {
                Object.assign(obj.attributes, a);
                return obj;
            },
            getAttributes: () => obj.attributes,
            isDirty: () => true,
            save: async () => true,
            delete: async () => 1,
            getDateFormat: () => 'YYYY-MM-DD HH:mm:ss',
        };
        return obj;
    }
}

describe('BelongsToMany & InteractsWithPivotTable 100% Coverage Suite', () => {
    let db;
    let conn;
    let schema;
    let user;
    let role1, role2, role3;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');
        schema = conn.getSchemaBuilder();
        Model.setConnectionResolver(db);

        await schema.dropTableIfExists('role_user_b2m');
        await schema.dropTableIfExists('roles_b2m');
        await schema.dropTableIfExists('users_b2m');

        await schema.createTable('users_b2m', (table) => {
            table.increments('id');
            table.integer('country_id').nullable();
            table.string('name');
            table.string('email');
            table.timestamps();
        });

        await schema.createTable('roles_b2m', (table) => {
            table.increments('id');
            table.string('name');
            table.timestamps();
        });

        await schema.createTable('role_user_b2m', (table) => {
            table.increments('id');
            table.integer('user_id');
            table.integer('role_id');
            table.string('level').nullable();
            table.timestamps();
        });

        user = await User.create({ name: 'Alice BelongsToMany', email: 'alice.b2m@example.com' });
        role1 = await Role.create({ name: 'Role 1' });
        role2 = await Role.create({ name: 'Role 2' });
        role3 = await Role.create({ name: 'Role 3' });
    });

    afterAll(async () => {
        if (db) {
            db.disconnect();
        }
    });

    test('resolveTableName with class and string variations', () => {
        class DummyPivotModel {
            getTable() { return 'dummy_pivots'; }
        }
        const relClass = new BelongsToMany(Role.newQuery(), user, DummyPivotModel, 'user_id', 'role_id', 'id', 'id', 'roles');
        expect(relClass.getTable()).toBe('dummy_pivots');

        const relStr = new BelongsToMany(Role.newQuery(), user, 'roles_users_custom', 'user_id', 'role_id', 'id', 'id', 'roles');
        expect(relStr.getTable()).toBe('roles_users_custom');
    });

    test('findOr, findOrFail, firstWhere, and firstOrFail branches', async () => {
        await user.roles().attach([role1.id, role2.id]);

        // findOrFail single success
        const found = await user.roles().findOrFail(role1.id);
        expect(found.id).toBe(role1.id);

        // findOrFail multiple success
        const foundMany = await user.roles().findOrFail([role1.id, role2.id]);
        expect(foundMany.length).toBe(2);

        // findOrFail fail single
        await expect(user.roles().findOrFail(9999)).rejects.toThrow(ModelNotFoundException);

        // findOrFail fail multiple
        await expect(user.roles().findOrFail([role1.id, 9999])).rejects.toThrow(ModelNotFoundException);

        // findOr success
        const foundOr = await user.roles().findOr(role1.id, () => 'fallback');
        expect(foundOr.id).toBe(role1.id);

        // findOr fallback
        const fallback = await user.roles().findOr(9999, () => 'fallback_executed');
        expect(fallback).toBe('fallback_executed');

        // findOr with columns
        const fallbackWithCols = await user.roles().findOr(9999, ['roles_b2m.id', 'roles_b2m.name'], () => 'fallback_cols');
        expect(fallbackWithCols).toBe('fallback_cols');

        // firstOrFail success
        const first = await user.roles().firstOrFail();
        expect(first).toBeDefined();

        // firstWhere
        const fw1 = await user.roles().firstWhere('name', 'Role 1');
        expect(fw1.id).toBe(role1.id);
        const fw2 = await user.roles().firstWhere('name', '=', 'Role 2');
        expect(fw2.id).toBe(role2.id);

        // Clean up
        await user.roles().detach([role1.id, role2.id]);

        // firstOrFail fail
        await expect(user.roles().where('roles_b2m.id', 9999).firstOrFail()).rejects.toThrow(ModelNotFoundException);
    });

    test('touchingParent, guessInverseRelation, touchIfTouching', async () => {
        const rel = user.roles();
        user.touches = (relName) => relName === 'roles';
        role1.touches = (relName) => true;

        await rel.touchIfTouching();
    });

    test('type conversions and pivot attributes casting', async () => {
        const rel = user.roles();
        expect(rel.getTypeSwapValue('int', '123')).toBe(123);
        expect(rel.getTypeSwapValue('integer', '456')).toBe(456);
        expect(rel.getTypeSwapValue('real', 12.34)).toBe(12.34);
        expect(rel.getTypeSwapValue('float', 56.78)).toBe(56.78);
        expect(rel.getTypeSwapValue('double', 90.12)).toBe(90.12);
        expect(rel.getTypeSwapValue('string', 100)).toBe('100');
        expect(rel.getTypeSwapValue('unknown', 'same')).toBe('same');

        const pivot = rel.newExistingPivot({ level: 'vip' });
        expect(pivot).toBeDefined();

        // getPivotColumns, qualifyPivotColumn
        expect(rel.getPivotColumns()).toEqual([]);
        expect(rel.qualifyPivotColumn('role_user_b2m.level')).toBe('role_user_b2m.level');
        expect(rel.qualifyPivotColumn('level')).toBe('role_user_b2m.level');
    });

    test('mocking paginate, simplePaginate, cursorPaginate, chunk, chunkById, each, lazy, lazyById, cursor', async () => {
        const fakeModel = {
            getAttributes: () => ({ id: 1, pivot_role_id: 2 }),
            setRelation: jest.fn(),
            qualifyColumn: (c) => c,
        };
        const fakeQuery = {
            getModel: () => Object.assign(new Role, {
                qualifyColumn: (c) => c,
                getKeyName: () => 'id',
            }),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            paginate: jest.fn().mockReturnValue({ items: () => [fakeModel] }),
            simplePaginate: jest.fn().mockReturnValue({ items: () => [fakeModel] }),
            cursorPaginate: jest.fn().mockReturnValue({ items: () => [fakeModel] }),
            chunk: jest.fn().mockImplementation((count, cb) => cb({ all: () => [fakeModel] }, 1)),
            chunkById: jest.fn().mockImplementation((count, cb) => cb({ all: () => [fakeModel] })),
            lazy: jest.fn().mockReturnValue({ map: (fn) => fn(fakeModel) }),
            lazyById: jest.fn().mockReturnValue({ map: (fn) => fn(fakeModel) }),
            cursor: jest.fn().mockReturnValue({ map: (fn) => fn(fakeModel) }),
            where: jest.fn().mockReturnThis(),
            join: jest.fn().mockReturnThis(),
        };

        const rel = new BelongsToMany(fakeQuery, user, 'role_user_b2m', 'user_id', 'role_id', 'id', 'id', 'roles');

        rel.paginate(15);
        rel.simplePaginate(15);
        rel.cursorPaginate(15);
        rel.chunk(10, () => {});
        rel.chunkById(10, () => {});
        rel.each(() => {});
        rel.lazy(10);
        rel.lazyById(10);
        rel.cursor();

        expect(fakeQuery.paginate).toHaveBeenCalled();
        expect(fakeQuery.simplePaginate).toHaveBeenCalled();
        expect(fakeQuery.cursorPaginate).toHaveBeenCalled();
        expect(fakeModel.setRelation).toHaveBeenCalled();
    });

    test('remaining branches in belongsToMany.js', async () => {
        // Line 68: table string containing / or \\
        const relSlash = new BelongsToMany(Role.newQuery(), user, 'my/custom/table', 'user_id', 'role_id', 'id', 'id', 'roles');
        expect(relSlash.getTable()).toBe('my/custom/table');

        // Line 149-155: getPivotClass, using, as
        expect(relSlash.getPivotClass()).toBe(Pivot);
        expect(relSlash.using(Role).getPivotClass()).toBe(Role);
        expect(relSlash.as('custom_pivot').getPivotAccessor()).toBe('custom_pivot');
        expect(relSlash.getPivotAccessor()).toBe('custom_pivot');
        expect(relSlash.getRelationName()).toBe('roles');

        // Line 343-345: findOr with array of IDs
        await user.roles().attach([role1.id, role2.id]);
        const foundArray = await user.roles().findOr([role1.id, role2.id], () => 'fallback');
        expect(foundArray.length).toBe(2);

        const foundArrayFallback = await user.roles().findOr([role1.id, 9999], () => 'fallback_executed');
        expect(foundArrayFallback).toBe('fallback_executed');

        // Line 476: each returning false breaks early
        const testRel = user.roles();
        testRel.chunk = jest.fn().mockImplementation((count, cb) => {
            return cb({ a: 1, b: 2 });
        });
        let countEach = 0;
        testRel.each((item) => {
            countEach++;
            return false;
        });
        expect(countEach).toBe(1);

        // Line 543: touchingParent() touches parent
        const touchingRel = user.roles();
        touchingRel.getRelated().touches = () => true;
        user.touches = () => false;
        user.touch = jest.fn();
        await touchingRel.touchIfTouching();
        expect(user.touch).toHaveBeenCalled();

        await user.roles().detach();
    });

    test('interactsWithPivotTable custom class and pivot where branches', async () => {
        // Custom pivot class
        class AdvancedPivot extends Pivot {
            getDateFormat() { return 'YYYY-MM-DD HH:mm:ss'; }
        }

        const customRel = user.roles().using(AdvancedPivot);

        // attachUsingCustomClass (with array & object format)
        await customRel.attach([role1.id, role2.id], { level: 'vip' });

        // updateExistingPivot using custom class
        await customRel.updateExistingPivot(role1.id, { level: 'supervip' });

        // updateExistingPivotUsingCustomClass when isDirty is false (hits line 156!)
        AdvancedPivot.prototype.isDirty = () => false;
        expect(await customRel.updateExistingPivot(role1.id, { level: 'same' })).toBe(false);
        AdvancedPivot.prototype.isDirty = () => true;

        // updateExistingPivot with wherePivot and timestamps on normal relation (hits line 132!)
        const normalRelWithWhere = user.roles().withTimestamps().wherePivot('level', 'vip');
        await normalRelWithWhere.attach(role1.id, { level: 'vip' });
        await normalRelWithWhere.updateExistingPivot(role1.id, { level: 'vip_updated' });
        await normalRelWithWhere.detach(role1.id);

        // updateExistingPivotUsingCustomClass when isDirty is false (hits line 156!)
        AdvancedPivot.prototype.isDirty = () => false;
        expect(await customRel.updateExistingPivot(role1.id, { level: 'same' })).toBe(false);
        AdvancedPivot.prototype.isDirty = () => true;

        // unmocked getCurrentlyAttachedPivots
        await user.roles().attach(role1.id, { level: 'attached_check' });
        const attached = await user.roles().getCurrentlyAttachedPivots();
        expect(attached.length).toBeGreaterThan(0);
        await user.roles().detach(role1.id);

        // detachUsingCustomClass
        await customRel.attach(role1.id, { level: 'custom_detach' });
        await customRel.detach(role1.id);

        // withPivot timestamps branches
        const timestampedRel = user.roles().withTimestamps('created_at', 'updated_at').using(AdvancedPivot);
        expect(timestampedRel.hasPivotColumn('created_at')).toBe(true);
        expect(timestampedRel.hasPivotColumn('updated_at')).toBe(true);
        AdvancedPivot.prototype.getDateFormat = () => 'YYYY-MM-DD';
        await timestampedRel.attach(role1.id, { level: 'standard' });
        await timestampedRel.updateExistingPivot(role1.id, { level: 'updated_standard' });
        await timestampedRel.detach(role1.id);

        // newPivotQuery with pivot wheres, pivotWhereIns, and pivotWhereNulls
        const filteredRel = user.roles()
            .wherePivot('level', '=', 'admin')
            .wherePivotIn('level', ['admin', 'moderator'])
            .wherePivotNull('level');

        expect(filteredRel.$pivotWheres.length).toBe(1);
        expect(filteredRel.$pivotWhereIns.length).toBe(1);
        expect(filteredRel.$pivotWhereNulls.length).toBe(1);

        const pq = filteredRel.newPivotQuery();
        expect(pq).toBeDefined();

        // parseIds with BaseCollection
        const BaseCollectModule = require('@ostro/contracts/collection/collect');
        const BaseCollect = BaseCollectModule.default || BaseCollectModule;
        class MockBaseCollection extends BaseCollect {
            toArray() { return [role1.id, role2.id]; }
        }
        expect(customRel.parseIds(new MockBaseCollection())).toEqual([role1.id, role2.id]);

        // extractAttachIdAndAttributes with object value
        const extracted = customRel.extractAttachIdAndAttributes(role1.id, { extra: true }, { default: false });
        expect(extracted[0]).toBe(role1.id);
        expect(extracted[1].extra).toBe(true);

        // --- PIVOT.JS 100% COVERAGE ---
        const testPivot = Pivot.fromAttributes(user, { user_id: 1, role_id: 2 }, 'role_user_b2m', false);
        expect(testPivot.getTable()).toBe('role_user_b2m');
        expect(testPivot.getDateFormat()).toBe('YYYY-MM-DD HH:mm:ss');
        
        // Proxy setter for target prop and symbol
        const sym = Symbol('test');
        testPivot[sym] = 'symValue';
        expect(testPivot[sym]).toBe('symValue');
        testPivot.$table = 'new_table';
        expect(testPivot.getTable()).toBe('new_table');
        testPivot.setTable('role_user_b2m');

        // Proxy setter for non-target prop ($attributes)
        testPivot.level = 'dynamic_value';
        expect(testPivot.level).toBe('dynamic_value');
        expect(testPivot.getAttributes().level).toBe('dynamic_value');

        // Pivot save (exists: false -> insert, then exists: true -> update)
        await testPivot.save();
        testPivot.level = 'updated_dynamic_value';
        await testPivot.save();

        // Pivot delete
        await testPivot.delete();

        // Lines 18 & 24 in pivot.js: target.$attributes falsy branch
        const rawPivot = new Pivot();
        rawPivot.$attributes = null;
        expect(rawPivot.nonExistentProp).toBeUndefined();
        rawPivot.newProp = 'val';
        expect(rawPivot.newProp).toBe('val');

        // belongsToMany.js line 378: getResults with null parent key
        const userWithoutKey = new User();
        userWithoutKey.setAttribute('id', null);
        const resNullKey = await userWithoutKey.roles().getResults();
        expect(resNullKey.length).toBe(0);

        // belongsToMany.js lines 387, 389: get with pre-existing select statements
        const userWithExistingColumns = user.roles();
        userWithExistingColumns.select('roles_b2m.id');
        const modelsExistingCols = await userWithExistingColumns.get();
        expect(modelsExistingCols).toBeDefined();

        // belongsToMany.js lines 387: builder with $query._statements fallback
        const mockQueryFallback = {
            getModel: () => new Role(),
            join: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            $query: { _statements: [{ grouping: 'columns' }] },
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getModels: jest.fn().mockResolvedValue([]),
        };
        const relMockStatements = new BelongsToMany(mockQueryFallback, user, 'role_user_b2m', 'user_id', 'role_id', 'id', 'id', 'roles');
        await relMockStatements.get();
        expect(mockQueryFallback.select).toHaveBeenCalled();

        // belongsToMany.js line 378: getResults with truthy parent key
        const userWithKey = user;
        const resWithKey = await userWithKey.roles().getResults();
        expect(resWithKey).toBeDefined();

        // belongsToMany.js line 387: builder with getQuery()._statements fallback
        const mockQueryWithGetQuery = {
            getModel: () => new Role(),
            join: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getQuery: () => ({ _statements: [{ grouping: 'columns' }] }),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getModels: jest.fn().mockResolvedValue([]),
        };
        const relMockGetQuery = new BelongsToMany(mockQueryWithGetQuery, user, 'role_user_b2m', 'user_id', 'role_id', 'id', 'id', 'roles');
        await relMockGetQuery.get();
        expect(mockQueryWithGetQuery.select).toHaveBeenCalled();

        // belongsToMany.js line 322: findOrFail with null result for array of IDs
        const relMockNullFind = user.roles();
        relMockNullFind.find = async () => null;
        await expect(relMockNullFind.findOrFail([role1.id])).rejects.toThrow();

        // belongsToMany.js line 568: touch() with $ids having .all() method, and with non-array/null
        const relTouch = user.roles();
        relTouch.allRelatedIds = async () => ({ all: () => [role1.id] });
        await relTouch.touch();

        relTouch.allRelatedIds = async () => null;
        await relTouch.touch();

        // interactsWithPivotTable.js line 242: $fresh with .format method
        class CustomPivotModel {
            getDateFormat() { return 'YYYY-MM-DD HH:mm:ss'; }
        }
        const relUsing = user.roles().using(CustomPivotModel);
        const origFresh = user.freshTimestampString;
        user.freshTimestampString = () => ({ format: (fmt) => '2026-01-01 00:00:00' });
        const recordWithFormat = relUsing.addTimestampsToAttachment({});
        expect(recordWithFormat).toBeDefined();
        user.freshTimestampString = origFresh;

        // interactsWithPivotTable.js line 355: withPivot with single non-array argument
        const relPivotSingle = user.roles();
        relPivotSingle.withPivot('single_col');
        expect(relPivotSingle.$pivotColumns).toContain('single_col');

        // interactsWithPivotTable.js line 107: attachNew with non-array $current
        const relAttachNew = user.roles();
        const changesNullCurrent = await relAttachNew.attachNew({ [role1.id]: { level: 'admin' } }, null, false);
        expect(changesNullCurrent).toBeDefined();

        // interactsWithPivotTable.js line 153: updateExistingPivotUsingCustomClass when $pivot is null/missing
        class FakePivotClass {
            getDateFormat() { return 'YYYY-MM-DD HH:mm:ss'; }
        }
        const relCustomMissing = user.roles().using(FakePivotClass);
        relCustomMissing.getCurrentlyAttachedPivots = async () => ({
            where: () => ({ where: () => ({ first: () => null }) })
        });
        const updatedFalse = await relCustomMissing.updateExistingPivotUsingCustomClass(9999, { level: 'x' }, false);
        expect(updatedFalse).toBe(false);

        // interactsWithPivotTable.js line 220: extractAttachIdAndAttributes with object value and scalar value
        const extractedObj = user.roles().extractAttachIdAndAttributes(role1.id, { extra: 'val' }, { base: 'val' });
        expect(extractedObj[0]).toBe(role1.id);
        expect(extractedObj[1].extra).toBe('val');

        const extractedScalar = user.roles().extractAttachIdAndAttributes('k', 'v', { base: 'val' });
        expect(extractedScalar[0]).toBe('v');
        expect(extractedScalar[1].base).toBe('val');

        // interactsWithPivotTable.js line 355: withPivot with array argument
        const relPivotArray = user.roles();
        relPivotArray.withPivot(['col_x', 'col_y']);
        expect(relPivotArray.$pivotColumns).toContain('col_x');
        expect(relPivotArray.$pivotColumns).toContain('col_y');

        // interactsWithPivotTable.js line 42: toggle with empty ids or no changes with touch = false
        const relToggle = user.roles();
        const toggleNoChanges = await relToggle.toggle([], false);
        expect(toggleNoChanges.attached.length).toBe(0);
        expect(toggleNoChanges.detached.length).toBe(0);

        // interactsWithPivotTable.js lines 71-72, 75: sync triggering touchIfTouching with touch=true and attached/detached empty
        const relSyncTouch = user.roles();
        let touchCalled = false;
        relSyncTouch.touchIfTouching = () => { touchCalled = true; };
        relSyncTouch.getCurrentlyAttachedPivots = async () => [];
        relSyncTouch.attachNew = async () => ({ attached: null, updated: [role1.id] });
        await relSyncTouch.sync({ [role1.id]: { level: 'editor' } }, false);
        expect(touchCalled).toBe(true);

        // interactsWithPivotTable.js line 99: formatRecordsList with non-object/scalar attrs (e.g. number or string)
        const formattedScalar = user.roles().formatRecordsList({ 1: 'scalar_val', 2: 42 });
        expect(formattedScalar[1]).toEqual({});
        expect(formattedScalar[2]).toEqual({});

        // belongsToMany.js line 344: findOr with result as plain Array and result as null for array ID
        const relMockArray = user.roles();
        relMockArray.find = async () => [role1];
        const resPlainArray = await relMockArray.findOr([role1.id], () => 'fallback');
        expect(resPlainArray.length).toBe(1);

        const relMockNull = user.roles();
        relMockNull.find = async () => null;
        const resNullArray = await relMockNull.findOr([role1.id], () => 'null_fallback');
        expect(resNullArray).toBe('null_fallback');

        // belongsToMany.js line 341: findOr with $id having toArray() via CollectionInterface
        const CollectionInterfaceModule = require('@ostro/contracts/collection/collect');
        const CollectionInterface = CollectionInterfaceModule.default || CollectionInterfaceModule;
        class MockCollectionContract extends CollectionInterface {
            toArray() { return [role1.id]; }
        }
        const contractColl = new MockCollectionContract();
        const relMockContract = user.roles();
        relMockContract.find = async () => [role1];
        const resIdToArray = await relMockContract.findOr(contractColl, () => 'fallback');
        expect(resIdToArray.length).toBe(1);

        // belongsToMany.js line 319 & 322: findOrFail with CollectionInterface and array result with length
        const resFindOrFailColl = await relMockContract.findOrFail(contractColl);
        expect(resFindOrFailColl.length).toBe(1);

        // belongsToMany.js line 305 & 307: findMany with empty CollectionInterface
        class MockEmptyCollectionContract extends CollectionInterface {
            toArray() { return []; }
        }
        const emptyColl = new MockEmptyCollectionContract();
        const resEmptyMany = await user.roles().findMany(emptyColl);
        expect(resEmptyMany.count ? resEmptyMany.count() : resEmptyMany.length).toBe(0);

        // belongsToMany.js line 365: first() returning null when results empty
        const relEmptyFirst = user.roles();
        relEmptyFirst.get = async () => [];
        const resNull = await relEmptyFirst.first();
        expect(resNull).toBeNull();

        // interactsWithPivotTable.js line 370: parseIds with object having toArray
        const parsedToArray = user.roles().parseIds({ toArray: () => [123, 456] });
        expect(parsedToArray).toEqual([123, 456]);

        // interactsWithPivotTable.js line 386: castKeys with non-array input
        const castNullKeys = user.roles().castKeys(null);
        expect(castNullKeys).toEqual([]);

        // interactsWithPivotTable.js line 17 & 57: newPivotQuery().pluck() returning { all: () => [...] }
        const mockPivotQuery = user.roles().newPivotQuery();
        mockPivotQuery.pluck = async () => ({ all: () => [role1.id] });
        const relPluckAll = user.roles();
        relPluckAll.newPivotQuery = () => mockPivotQuery;

        const toggleRes = await relPluckAll.toggle([role1.id], true);
        expect(toggleRes.detached.map(Number)).toContain(role1.id);

        const syncRes = await relPluckAll.sync([role2.id]);
        expect(syncRes.detached.map(Number)).toContain(role1.id);

        // interactsWithPivotTable.js line 75: sync touch when only detached has items
        let syncOnlyDetachTouch = false;
        const mockSyncDetach = user.roles().newPivotQuery();
        mockSyncDetach.pluck = async () => [role1.id];
        const relSyncDetach = user.roles();
        relSyncDetach.newPivotQuery = () => mockSyncDetach;
        relSyncDetach.attachNew = async () => ({ attached: [], updated: [] });
        relSyncDetach.touchIfTouching = async () => { syncOnlyDetachTouch = true; };
        await relSyncDetach.sync([]);
        expect(syncOnlyDetachTouch).toBe(true);

        // interactsWithPivotTable.js line 17 & 57: newPivotQuery().pluck() returning object without all() method
        const mockNoAllQuery = user.roles().newPivotQuery();
        mockNoAllQuery.pluck = async () => ({ not_all: true });
        const relNoAll = user.roles();
        relNoAll.newPivotQuery = () => mockNoAllQuery;
        await relNoAll.toggle([role1.id], false);
        await relNoAll.sync([role1.id], false);

        // interactsWithPivotTable.js line 72: newChanges['updated'] is undefined/falsy
        const relNoUpdated = user.roles();
        relNoUpdated.attachNew = async () => ({ attached: [role1.id] });
        await relNoUpdated.sync([role1.id], false);

        // interactsWithPivotTable.js line 133: attach() default parameters ($id = [], $attributes = {})
        const relAttach = user.roles();
        relAttach.newPivotStatement = () => ({ insert: jest.fn().mockResolvedValue(true) });
        const attachRes = await relAttach.attach([]);
        expect(attachRes).toBeUndefined();

        // interactsWithPivotTable.js line 286: newExistingPivot() default parameter ($attributes = [])
        const newExistPivot = user.roles().newExistingPivot();
        expect(newExistPivot).toBeDefined();

        // interactsWithPivotTable.js line 318: withPivot() called with single string or rest arguments (not array)
        const relWithPivot = user.roles().withPivot('created_at', 'status');
        expect(relWithPivot.$pivotColumns).toContain('created_at');
        expect(relWithPivot.$pivotColumns).toContain('status');
    });
});

