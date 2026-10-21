'use strict';

const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _MethodNotAvailable = require('@ostro/support/exceptions/methodNotAvailable');
const MethodNotAvailable = _MethodNotAvailable.default || _MethodNotAvailable;
const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;

class DeepModelUser extends Model {
    $table = 'deep_model_users';
    $fillable = ['name', 'email', 'status', 'meta'];
    $casts = {
        meta: 'json'
    };

    scopeActive(query) {
        return query.where('status', 'active');
    }

    scopeWithoutReturn(query) {
        // does not return anything, testing || self fallback
    }

    dummyRelation() {
        return {
            getQuery: () => ({ with: jest.fn() })
        };
    }

    getCustomAttribute() {
        return 'custom_value';
    }

    setCustomAttribute(value) {
        this.attributes['custom'] = value.toUpperCase();
    }
}

class NonTimestampModel extends Model {
    $table = 'non_timestamp_models';
    $timestamps = false;
    $fillable = ['title'];
}

describe('Eloquent Model, Scopes & Concerns Deep Tests', () => {
    let db;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        const schema = db.connection().getSchemaBuilder();

        await schema.createTable('deep_model_users', (table) => {
            table.increments('id');
            table.string('name').nullable();
            table.string('email').nullable();
            table.string('status').defaultTo('active');
            table.text('meta').nullable();
            table.timestamps();
        });

        await schema.createTable('non_timestamp_models', (table) => {
            table.increments('id');
            table.string('title').nullable();
        });
    });

    afterAll(async () => {
        const schema = db.connection().getSchemaBuilder();
        await schema.dropTableIfExists('deep_model_users');
        await schema.dropTableIfExists('non_timestamp_models');
        db.disconnect();
    });

    test('scope dynamic invocation via __call and static __call', async () => {
        await DeepModelUser.create({ name: 'Active User', status: 'active' });
        await DeepModelUser.create({ name: 'Inactive User', status: 'inactive' });

        const results = await DeepModelUser.active().get();
        expect(results.length).toBeGreaterThanOrEqual(1);

        const instance = new DeepModelUser();
        const activeInstance = instance.active();
        expect(activeInstance).toBeDefined();

        // Test scope without return for getTrap (line 990) and static __call (line 1019)
        const voidRes = instance.withoutReturn();
        expect(voidRes).toBeDefined();
        const staticVoidRes = DeepModelUser.withoutReturn();
        expect(staticVoidRes).toBeDefined();

        // Test instance __call directly
        const callVoidRes = instance.__call(instance, 'withoutReturn', []);
        expect(callVoidRes).toBeDefined();

        // Test instance __call query delegate
        instance.$query = { customQueryMethod: () => 'delegated' };
        expect(instance.__call(instance, 'customQueryMethod', [])).toBe('delegated');
    });

    test('Model proxy __call throws MethodNotAvailable for undefined methods', () => {
        const instance = new DeepModelUser();
        expect(() => {
            instance.nonExistentMethodXYZ();
        }).toThrow();

        expect(() => {
            DeepModelUser.nonExistentStaticMethodXYZ();
        }).toThrow();
    });

    test('HasTimestamps with disabled timestamps returns false on touch()', async () => {
        const item = new NonTimestampModel({ title: 'No Timestamps' });
        expect(item.usesTimestamps()).toBe(false);
        const touchResult = item.touch();
        expect(touchResult).toBe(false);

        expect(item.getQualifiedCreatedAtColumn()).toBe('non_timestamp_models.created_at');
        expect(item.getQualifiedUpdatedAtColumn()).toBe('non_timestamp_models.updated_at');
    });

    test('GuardsAttributes totallyGuarded and fillable checks', async () => {
        class GuardedUser extends Model {
            $table = 'deep_model_users';
            $guarded = ['*'];
            $fillable = [];
        }

        const guardedInstance = new GuardedUser();
        expect(guardedInstance.totallyGuarded()).toBe(true);
        expect(guardedInstance.isGuarded('any_col')).toBe(true);

        class UnguardedUser extends Model {
            $table = 'deep_model_users';
            $guarded = [];
            $fillable = ['title'];
        }
        const unguarded = new UnguardedUser();
        expect(unguarded.totallyGuarded()).toBe(false);
        expect(unguarded.isGuarded('title')).toBe(false);

        class SpecificGuardedUser extends Model {
            $table = 'deep_model_users';
            $guarded = ['secret_field'];
            $fillable = [];
        }
        const specificGuarded = new SpecificGuardedUser();
        expect(specificGuarded.isGuarded('secret_field')).toBe(true);
        expect(specificGuarded.isGuarded('other_field')).toBe(false);

        // Test isFillable with empty fillable, dot notation and leading underscore
        class EmptyFillableUser extends Model {
            $table = 'deep_model_users';
            $guarded = [];
            $fillable = [];
        }
        const emptyModel = new EmptyFillableUser();
        expect(emptyModel.isFillable('relation.field')).toBe(true);
        expect(emptyModel.isFillable('_hidden.field')).toBe(false);
        expect(emptyModel.isFillable('regular_field')).toBe(false);

        // Test isGuardableColumn uncached and cached
        const guardableCol = await emptyModel.isGuardableColumn('name');
        expect(guardableCol).toBe(true);
        const guardableColCached = await emptyModel.isGuardableColumn('non_existent_column');
        expect(guardableColCached).toBe(false);
    });

    test('HasAttributes mutators and syncOriginal checks', () => {
        const user = new DeepModelUser({ name: 'Test' });
        user.setRawAttributes({ name: 'Raw' }, true);
        expect(user.getOriginal('name')).toBe('Raw');

        // Accessing getAttribute for empty key or existing class prototype method
        expect(user.getAttribute(null)).toBeUndefined();
        expect(user.getAttribute('getTable')).toBeUndefined();
    });

    test('ModelNotFoundException and RelationNotFoundException getters and properties', () => {
        const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
        const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;
        const _RelationNotFoundException = require('../src/eloquent/relationNotFoundException');
        const RelationNotFoundException = _RelationNotFoundException.default || _RelationNotFoundException;

        const mnf = new ModelNotFoundException();
        mnf.setModel(DeepModelUser, [1, 2]);
        expect(mnf.getModel()).toBe(DeepModelUser);
        expect(mnf.getIds()).toEqual([1, 2]);
        expect(mnf.message).toContain('No query results for model');

        const mnfNoIds = new ModelNotFoundException();
        mnfNoIds.setModel(DeepModelUser, []);
        expect(mnfNoIds.message).toContain('No query results for model');

        const rnf = RelationNotFoundException.make(new DeepModelUser(), 'comments');
        expect(rnf.message).toContain('Call to undefined relationship [comments]');
        expect(rnf.name).toBe('RelationNotFoundException');

        const rnfDefault = new RelationNotFoundException();
        expect(rnfDefault.message).toBe('Invalid Argument');
    });

    test('Eloquent Collection toArray, toJSON, serialize and toJson', () => {
        const _Collection = require('../src/eloquent/collection');
        const Collection = _Collection.default || _Collection;
        const user1 = new DeepModelUser({ name: 'User 1' });
        const user2 = new DeepModelUser({ name: 'User 2' });

        const col = new Collection([user1, user2]);
        const arr = col.toArray();
        expect(Array.isArray(arr)).toBe(true);

        const jsonArr = col.toJSON();
        expect(Array.isArray(jsonArr)).toBe(true);

        const serialized = col.serialize();
        expect(Array.isArray(serialized)).toBe(true);

        const nonModelCol = new Collection(['str1', 'str2']);
        expect(nonModelCol.toArray()).toEqual(['str1', 'str2']);
        expect(nonModelCol.toJSON()).toEqual(['str1', 'str2']);
        expect(nonModelCol.toJson()).toEqual(['str1', 'str2']);

        // Non-array collection serialize branch (both non-model and model)
        const singleCol = new Collection([]);
        singleCol.all = () => 'single_string';
        expect(singleCol.serialize()).toBe('single_string');

        const modelCol = new Collection([]);
        modelCol.all = () => user1;
        expect(modelCol.serialize()).toEqual(user1.toJson());
    });

    test('Model dynamic call and static call dispatching with scopes and errors', () => {
        const user = new DeepModelUser();

        // Calling existing method
        expect(user.getTable()).toBe('deep_model_users');

        // Calling dynamic scope
        const activeRes = user.active();
        expect(activeRes).toBeDefined();

        // Scope without return fallback
        const withoutReturnRes = user.withoutReturn();
        expect(withoutReturnRes).toBeDefined();

        // Method available on inner query
        expect(typeof user.where).toBe('function');
        const whereRes = user.where('status', 'active');
        expect(whereRes).toBeDefined();

        // Method not available on model instance throws MethodNotAvailable
        expect(() => user.nonExistentMethod()).toThrow();

        // Static call to existing method or scope
        const staticActive = DeepModelUser.active();
        expect(staticActive).toBeDefined();

        const staticWithoutReturn = DeepModelUser.withoutReturn();
        expect(staticWithoutReturn).toBeDefined();

        // Static call to non-existent method throws MethodNotAvailable
        expect(() => DeepModelUser.completelyFakeMethod()).toThrow();
    });

    test('MultipleRecordsFoundException coverage with and without count', () => {
        const _MultipleRecordsFoundException = require('../src/eloquent/multipleRecordsFoundException');
        const MultipleRecordsFoundException = _MultipleRecordsFoundException.default || _MultipleRecordsFoundException;
        const ex1 = new MultipleRecordsFoundException();
        expect(ex1.message).toBe('Multiple records were found.');
        expect(ex1.code).toBe('ERR_MULTIPLE_RECORDS_FOUND');
        expect(ex1.statusCode).toBe(500);

        const ex2 = new MultipleRecordsFoundException(5);
        expect(ex2.message).toBe('5 records were found.');
    });

    test('Model with, withAttributes, eagerLoadRelation, relationsNestedUnder, toBase, raw', async () => {
        const u = new DeepModelUser();
        expect(u.toBase()).toBeDefined();
        expect(u.raw('1')).toBeDefined();

        // with() string, array, and callback
        u.with('profile');
        u.with('comments.author');
        u.with('roles:id,name');
        u.with(['posts:id,title', 'likes.user']);
        u.with('tags', ($q) => $q.where('active', 1));

        expect(u.relationsNestedUnder('comments')).toBeDefined();

        // withAttributes
        const userInst = new DeepModelUser({ name: 'Filtered', email: 'test@example.com' });
        userInst.withAttributes(['email'], false);
        userInst.withAttributes(true);

        // defaultKeyName and getForeignKey
        expect(userInst.defaultKeyName()).toBe('id');
        expect(userInst.getForeignKey()).toBe('deep_model_user_id');

        // qualifyColumn with and without dot
        expect(userInst.qualifyColumn('deep_model_users.id')).toBe('deep_model_users.id');
        expect(userInst.qualifyColumn('id')).toBe('deep_model_users.id');
    });

    test('Model create, insert, upsert, whereKey, whereKeyNot, find, firstOrNew, findOrNew, findOr, firstOr, firstOrFail', async () => {
        // create empty array branch and invalid item branch
        const emptyCreated = await DeepModelUser.create([]);
        expect(emptyCreated.count()).toBe(0);

        await expect(async () => {
            await DeepModelUser.create([null]);
        }).rejects.toThrow('Only json object allowed');

        // upsert throws under development
        expect(() => (new DeepModelUser()).upsert()).toThrow('Under development');

        // insert method directly
        const inserted = await (new DeepModelUser()).insert([{ name: 'Direct Insert', email: 'dir@test.com' }], 'id');
        expect(inserted).toBeDefined();

        // whereKey and whereKeyNot with single value, array, Model instance, and string/integer
        const user = await DeepModelUser.create({ name: 'Key User', email: 'key@test.com' });
        expect(await DeepModelUser.whereKey(user).first()).toBeDefined();
        expect(await DeepModelUser.whereKey(user.id).first()).toBeDefined();
        expect(await DeepModelUser.whereKey([user.id]).first()).toBeDefined();

        user.setKeyType('int');
        expect(await user.whereKey([user.id]).first()).toBeDefined();
        expect(await user.whereKeyNot([user.id + 999]).first()).toBeDefined();

        user.setKeyType('string');
        expect(await user.whereKey(user.id).first()).toBeDefined();
        expect(await user.whereKeyNot(user.id + 999).first()).toBeDefined();
        expect(await user.whereKeyNot(user).first()).toBeDefined();
        expect(await user.whereKeyNot([user.id + 999]).first()).toBeDefined();

        // find, firstOrNew, findOrNew, findOr, firstOr, firstOrFail
        const found = await DeepModelUser.find(user.id);
        expect(found.id).toBe(user.id);

        const fonExisting = await DeepModelUser.firstOrNew({ email: 'key@test.com' });
        expect(fonExisting.id).toBe(user.id);

        const fonNew = await DeepModelUser.firstOrNew({ email: 'nonexistent@test.com' }, { name: 'Brand New' });
        expect(fonNew.name).toBe('Brand New');
        expect(fonNew.$exists).toBe(false);

        const fonFound = await DeepModelUser.findOrNew(user.id);
        expect(fonFound.id).toBe(user.id);

        const fonMissing = await DeepModelUser.findOrNew(999999);
        expect(fonMissing.$exists).toBe(false);

        const foFound = await DeepModelUser.findOr(user.id, () => 'fallback');
        expect(foFound.id).toBe(user.id);

        const foFallback = await DeepModelUser.findOr(999999, () => 'fallback');
        expect(foFallback).toBe('fallback');

        const firstOrExisting = await DeepModelUser.where('email', 'key@test.com').firstOr(() => 'fallback');
        expect(firstOrExisting.id).toBe(user.id);

        const firstOrFallback = await DeepModelUser.where('email', 'ghost@test.com').firstOr(() => 'fallback');
        expect(firstOrFallback).toBe('fallback');

        const fof = await DeepModelUser.where('email', 'key@test.com').firstOrFail();
        expect(fof.id).toBe(user.id);

        await expect(DeepModelUser.where('email', 'ghost@test.com').firstOrFail()).rejects.toThrow();
    });

    test('Model findOrFail with array difference exception and composite/array key save', async () => {
        const u1 = await DeepModelUser.create({ name: 'Batch 1', email: 'b1@test.com' });
        const _BaseCollection = require('@ostro/support/collection');
        const BaseCollection = _BaseCollection.default || _BaseCollection;

        // findOrFail single success and missing
        const singleFound = await DeepModelUser.findOrFail(u1.id);
        expect(singleFound.id).toBe(u1.id);

        await expect(DeepModelUser.findOrFail(88888)).rejects.toThrow();

        // findOrFail array with BaseCollection difference
        const arrIds = new BaseCollection([u1.id, 99999]);
        await expect(DeepModelUser.findOrFail(arrIds)).rejects.toThrow();

        // Array key save and insertAndSetId branch
        const compModel = new DeepModelUser();
        compModel.setKeyName(['id', 'email']);
        expect(compModel.getKeyName()).toEqual(['id', 'email']);
        compModel.name = 'Composite';
        compModel.email = 'comp@test.com';
        await compModel.save();
        expect(compModel.id).toBeDefined();

        compModel.name = 'Composite Updated';
        await compModel.save();
    });

    test('Model global scopes, callScope, lazyQueries, delete, fresh and refresh', async () => {
        const u = new DeepModelUser();

        // global scopes
        const mockScope = {
            extend: jest.fn()
        };
        u.withGlobalScope('testScope', mockScope);
        expect(mockScope.extend).toHaveBeenCalledWith(u);

        expect(u.removedScopes()).toEqual([]);
        u.withoutGlobalScope('testScope');
        expect(u.removedScopes()).toContain('testScope');

        u.withGlobalScope('scope1', () => {});
        u.withGlobalScope('scope2', () => {});
        u.withoutGlobalScopes();

        // callScope
        const scopedRes = u.callScope(($q) => $q.where('id', 1));
        expect(scopedRes).toBeDefined();
        u.callScope(null);

        // withSavepointIfNeeded
        expect(u.withSavepointIfNeeded(() => 42)).toBe(42);

        // setLazyQuery and [kPerformRelationQuery]
        let lazyRan = false;
        u.setLazyQuery(() => { lazyRan = true; });
        u.setLazyQuery([() => {}]);
        await u.save({ touch: true });
        expect(lazyRan).toBe(true);

        // fresh and refresh on non-existing model
        const ghost = new DeepModelUser();
        expect(await ghost.fresh()).toBeNull();
        const refreshedGhost = await ghost.refresh();
        expect(refreshedGhost).toBeDefined();

        // fresh and refresh on saved model
        const saved = await DeepModelUser.create({ name: 'Fresh User', email: 'fresh@test.com' });
        const freshUser = await saved.fresh();
        expect(freshUser.name).toBe('Fresh User');

        saved.name = 'Pre-Refresh Change';
        await saved.refresh();
        expect(saved.name).toBe('Fresh User');

        // delete and destroy
        const delRes = await saved.delete();
        expect(delRes).toBe(true);
        expect(saved.$exists).toBe(false);

        const toDestroy = await DeepModelUser.create({ name: 'To Destroy', email: 'destroy@test.com' });
        await toDestroy.destroy(toDestroy.id);

        // delete without primary key throws
        const noKeyModel = new DeepModelUser();
        noKeyModel.setKeyName(null);
        await expect(noKeyModel.delete()).rejects.toThrow('No primary key defined on model.');
    });

    test('Model newModelQuery, newQueryWithoutRelationships, clone, getRelation exception', async () => {
        const u = new DeepModelUser({ name: 'Cloned' });
        expect(u.newQuery()).toBeDefined();
        expect(u.newQueryWithoutRelationships()).toBeDefined();

        const cloned = u.clone();
        expect(cloned.name).toBe('Cloned');

        // Non-existent relation throws RelationNotFoundException
        expect(() => u.getRelation('nonExistentRelation')).toThrow();

        // Non-incrementing model performInsert branch
        const nonInc = new NonTimestampModel();
        nonInc.$incrementing = false;
        expect(nonInc.getIncrementing()).toBe(false);
        nonInc.title = 'Manual ID';
        nonInc.id = 555;
        await nonInc.save();
        expect(nonInc.$exists).toBe(true);

        // Empty attributes non-incrementing
        const emptyNonInc = new NonTimestampModel();
        emptyNonInc.$incrementing = false;
        expect(await emptyNonInc.performInsert(emptyNonInc.newModelQuery())).toBe(true);
    });

    test('Model fillable, totallyGuarded error, instanceValues, toJSON, serialize, unsetConnectionResolver', async () => {
        // fillable method
        const u = new DeepModelUser();
        u.fillable({ name: 'Valid' });
        expect(u.name).toBe('Valid');

        expect(() => {
            u.fillable({ unknown_key: 'Val' });
        }).toThrow('Add column to fillable property to allow mass assignment');

        // fill with totallyGuarded error
        const guardedModel = new DeepModelUser();
        guardedModel.guard(['*']);
        guardedModel.totallyGuarded = () => true;
        guardedModel.fillableFromArray = (attr) => Object.keys(attr);
        guardedModel.isFillable = () => false;
        expect(() => {
            guardedModel.fill({ unfillable: 'boom' });
        }).toThrow('Add [unfillable] to fillable property to allow mass assignment');

        // instanceValues
        const instances = u.instanceValues([{ a: 1 }, { b: 2 }]);
        expect(instances).toHaveLength(2);

        // toJSON, serialize
        expect(u.toJSON()).toBeDefined();
        expect(u.serialize()).toBeDefined();

        // unsetConnectionResolver
        const prevResolver = Model.getConnectionResolver();
        Model.unsetConnectionResolver();
        expect(Model.getConnectionResolver()).toBeNull();
        Model.setConnectionResolver(prevResolver);

        // find without primaryKey throws
        const noPkModel = new DeepModelUser();
        noPkModel.setKeyName(null);
        expect(() => noPkModel.find(1)).toThrow('No primary key defined on model');

        // updateInserdtId with object values in composite keys
        const batchDatas = [{}, {}];
        const batchIds = [{ id: 101 }, { id: 102 }];
        u.setKeyName(['id']);
        u.updateInserdtId(batchDatas, batchIds);
        expect(batchDatas[0].id).toBe(101);
        u.setKeyName('id');

        // createSelectWithConstraint with BelongsToMany mock
        const _BelongsToMany = require('../src/eloquent/relations/belongsToMany');
        const BelongsToMany = _BelongsToMany.default || _BelongsToMany;
        const [relName, constraintFn] = u.createSelectWithConstraint('roles:id,name,other.custom');
        expect(relName).toBe('roles');
        const mockBelongsToMany = Object.create(BelongsToMany.prototype);
        mockBelongsToMany.getRelated = () => ({ getTable: () => 'roles' });
        const selectedCols = [];
        mockBelongsToMany.select = (cols) => { selectedCols.push(...cols); };
        constraintFn(mockBelongsToMany);
        expect(selectedCols).toContain('roles.id');
        expect(selectedCols).toContain('roles.name');
        expect(selectedCols).toContain('other.custom');

        // withoutGlobalScope with class object
        class ClassScope {
            apply() {}
        }
        u.withGlobalScope(ClassScope, new ClassScope());
        u.withoutGlobalScope(ClassScope);

        // Symbol set and function access on Model proxy
        const testSym = Symbol('test');
        u[testSym] = 123;
        expect(u[testSym]).toBe(123);

        const boundFn = u['getTable'];
        expect(typeof boundFn).toBe('function');
        expect(boundFn()).toBe('deep_model_users');

        // fillable with setter mutator
        const mutatorUser = new DeepModelUser();
        mutatorUser.$fillable = ['email'];
        const mockMutator = jest.fn();
        mutatorUser.setEmailAttribute = mockMutator;
        mutatorUser.fillable({ email: 'test@mutator.com' });
        expect(mockMutator).toHaveBeenCalledWith('test@mutator.com');

        // whereIntegerInRaw and whereIntegerNotInRaw mock coverage on model
        const mockRawQuery = {
            whereIntegerInRaw: jest.fn(),
            whereIntegerNotInRaw: jest.fn()
        };
        const rawModel = new DeepModelUser();
        rawModel.$query = mockRawQuery;
        rawModel.setKeyType('int');
        rawModel.whereKey([1, 2]);
        expect(mockRawQuery.whereIntegerInRaw).toHaveBeenCalled();
        rawModel.whereKeyNot([3, 4]);
        expect(mockRawQuery.whereIntegerNotInRaw).toHaveBeenCalled();

        // findOrFail with array where count does not match or result is null
        const findModel = new DeepModelUser();
        findModel.find = async () => null;
        await expect(findModel.findOrFail([1, 2])).rejects.toThrow();

        // withGlobalScope when this[kScopes] is falsy
        const scopeModel = new DeepModelUser();
        const scopesSym = Object.getOwnPropertySymbols(scopeModel).find(s => s.toString().includes('scopes'));
        scopeModel[scopesSym] = null;
        scopeModel.withGlobalScope('freshScope', () => {});

        // findOrFail with array matching result count
        const _BaseCollection = require('@ostro/support/collection');
        const BaseCollection = _BaseCollection.default || _BaseCollection;
        const user10 = new DeepModelUser({ id: 10 });
        const user20 = new DeepModelUser({ id: 20 });
        const mockFoundCol = new BaseCollection([user10, user20]);
        const arraySuccessModel = new DeepModelUser();
        arraySuccessModel.find = async () => mockFoundCol;
        const foundArrayResult = await arraySuccessModel.findOrFail(new BaseCollection([10, 20]));
        expect(foundArrayResult).toBe(mockFoundCol);

        // proxy __get scope lookup
        const activeScopeFn = u.active;
        expect(typeof activeScopeFn).toBe('function');
        const boundActiveRes = activeScopeFn();
        expect(boundActiveRes).toBeDefined();

        // proxy __call and static __call scope that returns falsy
        u.withoutReturn();
        DeepModelUser.withoutReturn();

        // direct __call and static __call invocation
        const customTarget = {
            constructor: { name: 'CustomTarget' },
            scopeCustom(target, arg) {
                return 'custom_' + arg;
            },
            scopeEmpty(target) {}
        };
        expect(Model.prototype.__call(customTarget, 'custom', ['ok'])).toBe('custom_ok');
        expect(Model.prototype.__call(customTarget, 'empty', [])).toBe(customTarget);
        expect(() => Model.prototype.__call(customTarget, 'nonExistentMethod', [])).toThrow();

        class StaticCustomTarget {
            scopeCustom(instance, arg) {
                return 'static_' + arg;
            }
            scopeEmpty(instance) {}
        }
        expect(Model.__call(StaticCustomTarget, 'custom', ['ok'])).toBe('static_ok');
        const staticEmptyRes = Model.__call(StaticCustomTarget, 'empty', []);
        expect(staticEmptyRes).toBeDefined();
        expect(() => Model.__call(StaticCustomTarget, 'nonExistentMethod', [])).toThrow();

        // findOrFail returning matching collection
        const mockModelInstance = new DeepModelUser();
        mockModelInstance.find = async (id) => [10];
        const arrayIdWithUnique = [10];
        arrayIdWithUnique.unique = () => [10];
        const foundMatch = await mockModelInstance.findOrFail(arrayIdWithUnique);
        expect(foundMatch).toEqual([10]);

        // proxy __get for function on model target
        const rawGetTarget = {
            customFn() { return 'hello'; }
        };
        const boundCustomFn = Model.prototype.__get(rawGetTarget, 'customFn', null);
        expect(boundCustomFn()).toBe('hello');

        // model.js line 668: performInsert with $id as a primitive number/string rather than array
        const rawInsertUser = new DeepModelUser({ name: 'RawInsert' });
        const mockRawPrimitiveQuery = {
            insert: async () => 12345,
            getConnection: () => null,
        };
        await rawInsertUser.performInsert(mockRawPrimitiveQuery);
        expect(rawInsertUser.id).toBe(12345);

        // performInsert with $id as plain array of primitives [12345]
        const rawInsertArrayUser = new DeepModelUser({ name: 'RawInsertArray' });
        const mockRawArrayQuery = {
            insert: async () => [12345],
            getConnection: () => null,
        };
        await rawInsertArrayUser.performInsert(mockRawArrayQuery);
        expect(rawInsertArrayUser.id).toBe(12345);

        // model.js line 806: findOrFail with array difference where $result is not null but has modelKeys()
        const mockFailWithKeys = new DeepModelUser();
        const fakeCollResult = [new DeepModelUser({ id: 1 })];
        fakeCollResult.modelKeys = () => [1];
        mockFailWithKeys.find = async () => fakeCollResult;
        const arrayDiff = [1, 2];
        arrayDiff.unique = () => [1, 2];
        arrayDiff.difference = (keys) => [2];
        await expect(mockFailWithKeys.findOrFail(arrayDiff)).rejects.toThrow(ModelNotFoundException);

        // model.js line 907: callScope when statements filter has no where statements or empty
        const userScopeTest = new DeepModelUser();
        userScopeTest.callScope(($m) => $m, []);

        // callScope with wheres present
        const queryWithWheres = {
            _statements: [{ type: 'where', column: 'id', value: 1 }]
        };
        const modelWithWheres = new DeepModelUser();
        modelWithWheres.getQuery = () => queryWithWheres;
        modelWithWheres.callScope(($m) => $m, []);
        // model.js line 121: fillable loop when obj does not have own property
        const objWithProto = Object.create({ name: 'Inherited' });
        userScopeTest.fillable(objWithProto);

        // model.js line 141: fill() with unfillable attribute when model is NOT totallyGuarded
        const unguardedUser = new DeepModelUser();
        unguardedUser.guard([]);
        unguardedUser.fillableFromArray = (attr) => Object.keys(attr);
        unguardedUser.isFillable = () => false;
        unguardedUser.fill({ nonFillableIgnored: 123 });

        // model.js line 154: addTimestampsToInsertValues when $timestamps is true and datas is already an Array
        const arrayDataWithTimestamps = [{}];
        userScopeTest.$timestamps = true;
        userScopeTest.addTimestampsToInsertValues(arrayDataWithTimestamps);
        expect(arrayDataWithTimestamps[0][userScopeTest.CREATED_AT]).toBeDefined();

        // model.js line 169: updateInserdtId with composite keys where value is not an object (primitive)
        const compositeDatas = [{}];
        const compositeCompUser = new DeepModelUser();
        compositeCompUser.setKeyName(['k1', 'k2']);
        compositeCompUser.updateInserdtId(compositeDatas, [999]);
        expect(compositeDatas[0].k1).toBe(999);

        // model.js line 243: addWhereExistsQuery with boolean='or' and $not=true / $not=false
        const mockExistsQuery = {
            getQueryBuilder: () => ({ isMock: true })
        };
        const existsModel = new DeepModelUser();
        existsModel.orWhereExists = jest.fn();
        existsModel.orWhereNotExists = jest.fn();
        existsModel.whereExists = jest.fn();
        existsModel.whereNotExists = jest.fn();

        existsModel.addWhereExistsQuery(mockExistsQuery, 'or', false);
        expect(existsModel.orWhereExists).toHaveBeenCalled();
        existsModel.addWhereExistsQuery(mockExistsQuery, 'or', true);
        expect(existsModel.orWhereNotExists).toHaveBeenCalled();
        existsModel.addWhereExistsQuery(mockExistsQuery, 'and', true);
        expect(existsModel.whereNotExists).toHaveBeenCalled();

        // model.js line 244: addWhereExistsQuery with fallback when $query is raw string or knex
        existsModel.addWhereExistsQuery('RAW_EXISTS');

        // model.js line 256: create() when passed empty array vs empty object
        const emptyCreatedArray = await DeepModelUser.create([]);
        expect(emptyCreatedArray.length).toBe(0);

        // model.js line 278: create() when data is not an array (returns instances[0])
        const singleCreated = await DeepModelUser.create({ name: 'SingleItem', email: 'single@example.com' });
        expect(singleCreated.name).toBe('SingleItem');

        // model.js line 290: insert() without $ids parameter
        const insertModel = new DeepModelUser();
        insertModel.$query = {
            insert: jest.fn().mockResolvedValue([1001])
        };
        await insertModel.insert([{ name: 'InsertNoId' }]);
        expect(insertModel.$query.insert).toHaveBeenCalled();

        // model.js line 306: createSelectWithConstraint with dot in column name
        const [, dotConstraint] = userScopeTest.createSelectWithConstraint('posts:id,posts.title');
        const mockSelectQuery = { select: jest.fn() };
        dotConstraint(mockSelectQuery);
        expect(mockSelectQuery.select).toHaveBeenCalled();

        // model.js line 333: addNestedWiths without $results argument
        const defaultNested = userScopeTest.addNestedWiths('a.b');
        expect(defaultNested['a']).toBeDefined();

        // model.js line 339: addNestedWiths when $results[$last] is already defined
        const existingResults = { 'a': () => {} };
        userScopeTest.addNestedWiths('a.b', existingResults);

        // model.js line 426: hydrate with plain object or non-array $items
        const hydratedNull = userScopeTest.hydrate(null);
        expect(hydratedNull.length).toBe(0);

        // model.js line 442: newCollection without arguments
        const defaultCollection = userScopeTest.newCollection();
        expect(defaultCollection.length).toBe(0);

        // model.js line 551: withAttributes with boolean first argument
        const withAttrsBool = userScopeTest.withAttributes(true);
        expect(withAttrsBool).toBeDefined();

        // model.js line 594: save() when this.getConnectionName() already returns a name
        const connNameModel = new DeepModelUser({ name: 'ConnUser', email: 'conn@example.com' });
        connNameModel.getConnectionName = () => 'sqlite';
        connNameModel.$exists = false;
        await connNameModel.save();

        // model.js line 599: save() returning false when performUpdate/performInsert returns false
        const failSaveModel = new DeepModelUser({ name: 'FailSave' });
        failSaveModel.performInsert = async () => false;
        const saveRes = await failSaveModel.save();
        expect(saveRes).toBe(false);

        // model.js line 607: finishSave without arguments
        userScopeTest.finishSave();

        // model.js line 624: performUpdate when $dirty is empty
        const cleanUpdateModel = new DeepModelUser({ id: 1, name: 'Clean' });
        cleanUpdateModel.$timestamps = false;
        cleanUpdateModel.syncOriginal();
        const updateRes = await cleanUpdateModel.performUpdate({});
        expect(updateRes).toBe(true);

        // model.js line 652: getKeyForSaveQuery when key is explicitly passed
        const customKeyForSave = userScopeTest.getKeyForSaveQuery('custom_pk');
        expect(customKeyForSave).toBeUndefined();

        // model.js line 668: performInsert with $id as array of objects [{ id: 123 }]
        const objInsertUser = new DeepModelUser({ name: 'ObjInsert' });
        const mockObjInsertQuery = {
            insert: async () => [{ id: 98765 }],
            getConnection: () => null,
        };
        await objInsertUser.performInsert(mockObjInsertQuery);
        expect(objInsertUser.id).toBe(98765);

        // model.js line 724: whereKey with string keyType and $id !== null
        const strKeyModel = new DeepModelUser();
        strKeyModel.setKeyType('string');
        strKeyModel.whereKey(12345);

        // model.js line 746: whereKeyNot with string keyType and $id !== null
        strKeyModel.whereKeyNot(12345);

        // model.js line 776: performDeleteOnModel when $primaryKey is NOT in getAttributes()
        const delNoPkModel = new DeepModelUser();
        delNoPkModel.setKeyName('non_existent_key');
        delNoPkModel.$exists = true;
        delNoPkModel.$attributes = { other_col: 'value' };
        delNoPkModel.$query = { delete: jest.fn().mockResolvedValue(1) };
        await delNoPkModel.performDeleteOnModel();
        expect(delNoPkModel.$exists).toBe(false);

        // model.js line 790: firstOrNew without arguments
        await userScopeTest.firstOrNew();

        // model.js line 806: findOrFail with array and $result having modelKeys()
        const fakeResultWithKeys = [new DeepModelUser({ id: 1 })];
        fakeResultWithKeys.modelKeys = () => [1];
        const failModelWithKeys = new DeepModelUser();
        failModelWithKeys.find = async () => fakeResultWithKeys;
        const diffArr = [1, 2];
        diffArr.unique = () => [1, 2];
        diffArr.difference = () => [2];
        await expect(failModelWithKeys.findOrFail(diffArr)).rejects.toThrow(ModelNotFoundException);

        // model.js line 831-832: findOr when $columns is a callback function
        const callbackRes = await userScopeTest.findOr(999999, () => 'found_via_callback');
        expect(callbackRes).toBe('found_via_callback');

        // findOr when $columns is an array and $callback is provided
        const callbackArrayRes = await userScopeTest.findOr(999999, ['*'], () => 'found_via_callback_2');
        expect(callbackArrayRes).toBe('found_via_callback_2');

        // model.js line 854: firstOrCreate with default create argument
        const firstOrCreated = await DeepModelUser.firstOrCreate({ email: 'first.or.created.default@example.com' });
        expect(firstOrCreated).toBeDefined();

        // model.js line 862-863: firstOr when $columns is a callback function
        const firstOrCb = await userScopeTest.firstOr(() => 'first_or_cb');
        expect(firstOrCb).toBeDefined();

        const firstOrNotFound = new DeepModelUser();
        firstOrNotFound.first = async () => null;
        const firstOrCbResult = await firstOrNotFound.firstOr(() => 'first_or_fallback');
        expect(firstOrCbResult).toBe('first_or_fallback');

        // firstOr with explicit $columns array and $callback
        const firstOrCbResult2 = await firstOrNotFound.firstOr(['*'], () => 'first_or_fallback_2');
        expect(firstOrCbResult2).toBe('first_or_fallback_2');

        // model.js line 154: addTimestampsToInsertValues with non-array single object
        const cleanExistsModel = new DeepModelUser({ id: 1, name: 'CleanExists' });
        const singleInsertObj = { name: 'SingleObj' };
        cleanExistsModel.addTimestampsToInsertValues(singleInsertObj);
        expect(singleInsertObj.created_at).toBeDefined();

        // model.js line 244: addWhereExistsQuery with object having $query property
        cleanExistsModel.addWhereExistsQuery({ $query: 'SELECT 1' });

        // model.js line 256: create() with empty array
        const emptyCreateCol = await DeepModelUser.create([]);
        expect(emptyCreateCol.count()).toBe(0);

        // model.js line 278: create() with array of instances
        const multiCreated = await DeepModelUser.create([
            { name: 'Multi1', email: 'multi1@example.com' },
            { name: 'Multi2', email: 'multi2@example.com' }
        ]);
        expect(multiCreated.count()).toBe(2);

        // model.js line 426: hydrate() with .all(), null, and plain object
        const hydAll = cleanExistsModel.hydrate({ all: () => [{ id: 101, name: 'H1' }, { id: 102, name: 'H2' }] });
        expect(hydAll.count()).toBe(2);
        const hydNull = cleanExistsModel.hydrate(null);
        expect(hydNull.count()).toBe(0);
        const hydObj = cleanExistsModel.hydrate({ a: { id: 103, name: 'H3' } });
        expect(hydObj.count()).toBe(1);

        // model.js line 498 & 503: getRelation when relation exists and has nested relations
        const nestedModel = new DeepModelUser();
        const nestedEagerSym = Object.getOwnPropertySymbols(nestedModel).find(s => s.toString().includes('eagerLoad'));
        nestedModel[nestedEagerSym]['dummyRelation.sub'] = () => {};
        const gotRel = nestedModel.getRelation('dummyRelation');
        expect(gotRel).toBeDefined();

        // model.js line 534: eagerLoadRelations when this[kEagerLoad] has relations
        const eagerModel = new DeepModelUser();
        const eagerSym = Object.getOwnPropertySymbols(eagerModel).find(s => s.toString().includes('eagerLoad'));
        eagerModel[eagerSym].author = () => {};
        eagerModel.eagerLoadRelation = jest.fn().mockImplementation((m) => m);
        await eagerModel.eagerLoadRelations([]);
        expect(eagerModel.eagerLoadRelation).toHaveBeenCalled();

        // model.js line 590: save() when this.$exists is true but isDirty() is false
        const cleanExistsModel2 = new DeepModelUser({ id: 1, name: 'CleanExists' });
        cleanExistsModel2.$exists = true;
        cleanExistsModel2.syncOriginal();
        const cleanSaveRes = await cleanExistsModel2.save();
        expect(cleanSaveRes).toBe(true);

        // model.js line 642 & 652: setKeysForSaveQuery and getKeyForSaveQuery
        const compKeysModel = new DeepModelUser();
        compKeysModel.setRawAttributes({ id: 10, tenant_id: 20 }, true);
        compKeysModel.setKeyName(['id', 'tenant_id']);
        const compQuery = { where: jest.fn() };
        compKeysModel.setKeysForSaveQuery(compQuery);
        expect(compQuery.where).toHaveBeenCalledWith({ id: 10, tenant_id: 20 });

        // getKeyForSaveQuery fallback to getKey()
        const fallbackKeyModel = new DeepModelUser();
        fallbackKeyModel.setAttribute('id', 99);
        expect(fallbackKeyModel.getKeyForSaveQuery()).toBe(99);

        // model.js line 859: firstOrCreate when record already exists (res is truthy)
        const existCreated = await DeepModelUser.firstOrCreate({ email: 'first.or.created.default@example.com' });
        expect(existCreated.email).toBe('first.or.created.default@example.com');



        // model.js line 642: setKeysForSaveQuery when getKeyName is a single string (not an array)
        const singleKeyModel = new DeepModelUser();
        singleKeyModel.setKeyName('id');
        singleKeyModel.setAttribute('id', 777);
        const singleKeyQuery = { where: jest.fn() };
        singleKeyModel.setKeysForSaveQuery(singleKeyQuery);
        expect(singleKeyQuery.where).toHaveBeenCalledWith({ id: 777 });

        // model.js line 783: performDeleteOnModel when attributes are completely empty
        const emptyAttrDeleteModel = new DeepModelUser();
        emptyAttrDeleteModel.$attributes = {};
        emptyAttrDeleteModel.$query = { delete: jest.fn().mockResolvedValue(1) };
        await emptyAttrDeleteModel.performDeleteOnModel();
        expect(emptyAttrDeleteModel.$query.delete).toHaveBeenCalled();

        // model.js line 878: updateOrCreate when record does not exist initially, then updateOrCreate again when it does exist
        const upEmail = 'update_or_create_toggle@example.com';
        const upCreated = await DeepModelUser.updateOrCreate({ email: upEmail }, { name: 'InitialUp' });
        expect(upCreated.name).toBe('InitialUp');
        const upUpdated = await DeepModelUser.updateOrCreate({ email: upEmail }, { name: 'FinalUp' });
        expect(upUpdated.name).toBe('FinalUp');

        // model.js line 907: callScope when wheres is null or wheres has items
        const nullWheresModel = new DeepModelUser();
        nullWheresModel.getQuery = () => ({
            _statements: {
                filter: () => null
            }
        });
        nullWheresModel.callScope(($m) => $m, []);

        const withWheresModel = new DeepModelUser();
        withWheresModel.getQuery = () => ({
            _statements: [{ type: 'where', column: 'id', value: 1 }]
        });
        withWheresModel.callScope(($m) => $m, []);

        // model.js line 909: callScope when $scope is not a function, or returns falsy
        const nonFnScopeRes = userScopeTest.callScope('NOT_A_FUNCTION');
        expect(nonFnScopeRes).toBeDefined();
        const undefinedScopeRes = userScopeTest.callScope(() => undefined);
        expect(undefinedScopeRes).toBeDefined();

        // model.js line 916: withoutGlobalScopes with null or undefined when this[kScopes] has keys or undefined
        userScopeTest.withGlobalScope('test_temp_scope', () => {});
        userScopeTest.withoutGlobalScopes(null);

        const noScopesModel = new DeepModelUser();
        const kScopesSym = Object.getOwnPropertySymbols(noScopesModel).find(s => s.toString().includes('scopes'));
        noScopesModel[kScopesSym] = undefined;
        noScopesModel.withoutGlobalScopes();
    });
});


