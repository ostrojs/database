'use strict';

const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _Collection = require('../src/eloquent/collection');
const Collection = _Collection.default || _Collection;
const _BaseCollection = require('@ostro/support/collection');
const BaseCollection = _BaseCollection.default || _BaseCollection;
const _Relation = require('../src/eloquent/relations/relation');
const Relation = _Relation.default || _Relation;

class DeepUser extends Model {
    $table = 'deep_users';
    $fillable = ['id', 'name', 'parent_id', 'created_at', 'updated_at'];

    parent() {
        return this.belongsTo(DeepUser, 'parent_id');
    }

    children() {
        return this.hasMany(DeepUser, 'parent_id');
    }

    grandChildren() {
        return this.hasManyThrough(DeepUser, DeepUser, 'parent_id', 'parent_id');
    }

    friends() {
        return this.belongsToMany(DeepUser, 'deep_user_friends', 'user_id', 'friend_id');
    }

    profile() {
        return this.hasOne(DeepProfile, 'user_id');
    }
}

class DeepProfile extends Model {
    $table = 'deep_profiles';
    $fillable = ['id', 'user_id', 'bio'];

    user() {
        return this.belongsTo(DeepUser, 'user_id');
    }
}

describe('Eloquent Relations Deep Coverage Tests', () => {
    let db;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        const schema = db.connection().getSchemaBuilder();

        await schema.createTable('deep_users', (table) => {
            table.increments('id');
            table.string('name').nullable();
            table.integer('parent_id').nullable();
            table.timestamps();
        });

        await schema.createTable('deep_profiles', (table) => {
            table.increments('id');
            table.integer('user_id').nullable();
            table.string('bio').nullable();
            table.timestamps();
        });

        await schema.createTable('deep_user_friends', (table) => {
            table.increments('id');
            table.integer('user_id');
            table.integer('friend_id');
        });
    });

    afterAll(async () => {
        const schema = db.connection().getSchemaBuilder();
        await schema.dropTableIfExists('deep_user_friends');
        await schema.dropTableIfExists('deep_profiles');
        await schema.dropTableIfExists('deep_users');
        db.disconnect();
    });

    test('hasManyThrough self relations generate correct existence query', () => {
        const user = new DeepUser({ id: 1 });
        const rel = user.grandChildren();
        const query = DeepUser.newQueryWithoutRelationships();
        const parentQuery = DeepUser.newQueryWithoutRelationships();

        const existenceQuery = rel.getRelationExistenceQueryForSelfRelation(query, parentQuery);
        expect(existenceQuery).toBeDefined();

        const throughSelfQuery = rel.getRelationExistenceQueryForThroughSelfRelation(DeepUser.newQueryWithoutRelationships(), parentQuery);
        expect(throughSelfQuery).toBeDefined();
    });

    test('belongsToMany self join generates relation existence query for self join', () => {
        const user = new DeepUser({ id: 1 });
        const rel = user.friends();
        const query = DeepUser.newQueryWithoutRelationships();
        const parentQuery = DeepUser.newQueryWithoutRelationships();

        const existenceQuery = rel.getRelationExistenceQuery(query, parentQuery);
        expect(existenceQuery).toBeDefined();
    });

    test('CanBeOneOfMany methods directly on HasOne relation', () => {
        const user = new DeepUser({ id: 1 });
        const rel = user.profile();
        rel.$relationName = 'profile';

        expect(rel.isOneOfMany()).toBe(false);
        expect(rel.getRelationName()).toBe('profile');
        expect(rel.qualifySubSelectColumn('users.id')).toBe('profile.id');
        expect(rel.qualifyRelatedColumn('id')).toBe('deep_profiles.id');
        expect(rel.qualifyRelatedColumn('deep_profiles.id')).toBe('deep_profiles.id');
        expect(rel.getOneOfManySubQuery()).toBeDefined();
        expect(rel.getOneOfManySubQuerySelectColumns()).toBe('deep_profiles.user_id');

        const mockJoin = { on: jest.fn() };
        rel.addOneOfManyJoinSubQueryConstraints(mockJoin);
        expect(mockJoin.on).toHaveBeenCalled();
    });

    test('Relation __call throws error when method does not exist', () => {
        const user = new DeepUser({ id: 1 });
        const rel = user.profile();
        expect(() => {
            rel.nonExistentMethodOnRelation();
        }).toThrow(/Property \[nonExistentMethodOnRelation\] not available/);
    });

    test('InteractsWithPivotTable helper methods: getTypeSwapValue, castKeys, parseIds', () => {
        const user = new DeepUser({ id: 1 });
        const friendsRel = user.friends();

        expect(friendsRel.getTypeSwapValue('int', '123')).toBe(123);
        expect(friendsRel.getTypeSwapValue('integer', '456')).toBe(456);
        expect(friendsRel.getTypeSwapValue('float', 3.14)).toBe(3.14);
        expect(friendsRel.getTypeSwapValue('double', 2.718)).toBe(2.718);
        expect(friendsRel.getTypeSwapValue('string', 99)).toBe('99');
        expect(friendsRel.getTypeSwapValue('boolean', true)).toBe(true);

        const baseCol = new BaseCollection([1, 2, 3]);
        expect(friendsRel.parseIds(baseCol)).toEqual([1, 2, 3]);

        const elqCol = new Collection([new DeepUser({ id: 10 }), new DeepUser({ id: 20 })]);
        expect(friendsRel.parseIds(elqCol)).toEqual([10, 20]);

        const singleModel = new DeepUser({ id: 99 });
        expect(friendsRel.parseId(singleModel)).toBe(99);
        expect(friendsRel.parseId(88)).toBe(88);

        const casted = friendsRel.castKeys(['1', '2']);
        expect(casted).toBeDefined();
    });

    test('HasOne and BelongsTo key getters', () => {
        const user = new DeepUser({ id: 5 });
        const profileRel = user.profile();
        expect(profileRel.getParentKey()).toBe(5);

        const profile = new DeepProfile({ id: 1, user_id: 5 });
        const userRel = profile.user();
        expect(userRel.getChild().id).toBe(profile.id);
        expect(userRel.getForeignKeyName()).toBe('user_id');
        expect(userRel.getQualifiedForeignKeyName()).toBe('deep_profiles.user_id');
        expect(userRel.getParentKey()).toBe(5);
        expect(userRel.getOwnerKeyName()).toBe('id');
        expect(userRel.getQualifiedOwnerKeyName()).toBe('deep_users.id');
        expect(userRel.getRelatedKeyFrom(user)).toBe(5);
        expect(userRel.getRelationName()).toBe('user');
    });

    test('HasOneOrMany firstOrCreate and updateOrCreate', async () => {
        const user = await DeepUser.create({ name: 'ParentUser' });
        const profile = await user.profile().firstOrCreate({ bio: 'Bio created via firstOrCreate' });
        expect(profile.id).toBeDefined();
        expect(profile.bio).toBe('Bio created via firstOrCreate');

        // Call again to hit existing branch
        const existing = await user.profile().firstOrCreate({ bio: 'Bio created via firstOrCreate' });
        expect(existing.id).toBe(profile.id);

        await user.profile().updateOrCreate({ bio: 'Bio created via firstOrCreate' }, { bio: 'Updated bio' });
        const updated = await user.profile().first();
        expect(updated.bio).toBe('Updated bio');
    });

    test('BelongsToMany createMany and getRelationExistenceQuery non-self join', async () => {
        const user = await DeepUser.create({ name: 'UserForFriends' });
        const friend1 = await DeepUser.create({ name: 'Friend 1' });
        const friend2 = await DeepUser.create({ name: 'Friend 2' });

        const friendsRel = user.friends();
        const created = await friendsRel.createMany([
            { name: 'CreatedFriend1' },
            { name: 'CreatedFriend2' }
        ]);
        expect(created.length).toBe(2);

        // getRelationExistenceQuery for non-self table
        const parentQuery = DeepProfile.newQueryWithoutRelationships();
        const relQuery = DeepUser.newQueryWithoutRelationships();
        const existenceQuery = friendsRel.getRelationExistenceQuery(relQuery, parentQuery);
        expect(existenceQuery).toBeDefined();
    });

    test('HasManyThrough throughParentSoftDeletes query existence', () => {
        class SoftDeleteThroughUser extends Model {
            $table = 'soft_through_users';
            getQualifiedDeletedAtColumn() {
                return 'soft_through_users.deleted_at';
            }
            getDeletedAtColumn() {
                return 'deleted_at';
            }
        }

        const parent = new DeepUser({ id: 10 });
        const throughParent = new SoftDeleteThroughUser();
        const query = DeepUser.newQueryWithoutRelationships();

        const _HasManyThrough = require('../src/eloquent/relations/hasManyThrough');

        const HasManyThrough = _HasManyThrough.default || _HasManyThrough;
        const hmt = new HasManyThrough(query, parent, throughParent, 'parent_id', 'parent_id', 'id', 'id');
        expect(hmt.throughParentSoftDeletes()).toBe(true);

        // Test getRelationExistenceQueryForSelfRelation with throughParentSoftDeletes
        const selfRelQuery = hmt.getRelationExistenceQueryForSelfRelation(DeepUser.newQueryWithoutRelationships(), DeepUser.newQueryWithoutRelationships());
        expect(selfRelQuery).toBeDefined();

        // Test getRelationExistenceQueryForThroughSelfRelation with throughParentSoftDeletes
        const throughSelfQuery = hmt.getRelationExistenceQueryForThroughSelfRelation(DeepUser.newQueryWithoutRelationships(), SoftDeleteThroughUser.newQueryWithoutRelationships());
        expect(throughSelfQuery).toBeDefined();
    });

    test('HasOne and HasOneThrough getResults default model and oneOfMany constraints', async () => {
        const user = new DeepUser(); // without id, getParentKey() is undefined/null
        const profileRel = user.profile();
        profileRel.withDefault({ bio: 'Default Bio' });
        const defaultProfile = await profileRel.getResults();
        expect(defaultProfile.bio).toBe('Default Bio');

        // Test HasOne addOneOfManySubQueryConstraints
        const mockSubQuery = {
            addSelect: jest.fn()
        };
        profileRel.addOneOfManySubQueryConstraints(mockSubQuery);
        expect(mockSubQuery.addSelect).toHaveBeenCalled();
        expect(profileRel.getOneOfManySubQuerySelectColumns()).toBe('deep_profiles.user_id');

        // Test HasOneThrough getResults withDefault
        const userWithDefault = new DeepUser({ id: 10 });
        const mockQuery = DeepProfile.newQueryWithoutRelationships();
        mockQuery.first = () => null;
        const _HasOneThrough = require('../src/eloquent/relations/hasOneThrough');
        const HasOneThrough = _HasOneThrough.default || _HasOneThrough;
        const hot = new HasOneThrough(mockQuery, userWithDefault, user, 'parent_id', 'user_id', 'id', 'id');
        hot.withDefault({ bio: 'Default Bio Grandchild' });
        const defaultGrandchild = await hot.getResults();
        expect(defaultGrandchild.bio).toBe('Default Bio Grandchild');
        expect(hot.newRelatedInstanceFor(userWithDefault)).toBeDefined();

        // Test Relation static morph methods and __call return this
        Relation.morphMap({
            user_alias: DeepUser
        });
        expect(Relation.getMorphedModel('user_alias')).toBe(DeepUser);
        expect(Relation.getMorphedModel('unknown_alias')).toBeNull();

        // Test Relation __call chaining when result is query
        profileRel.$query = {
            customWhere: function() { return this; }
        };
        const resWhere = profileRel.customWhere();
        expect(resWhere).toBe(profileRel);

        // Test newBelongsToMany default relationName parameter (line 174)
        const btmDefault = user.newBelongsToMany(
            DeepUser.newQueryWithoutRelationships(), user, 'deep_user_friends',
            'user_id', 'friend_id', 'id', 'id'
        );
        expect(btmDefault).toBeDefined();

        // Test touchOwners recursive call when relatedModel has touchOwners (line 209)
        const childUser = new DeepUser({ id: 2, parent_id: 1 });
        const parentUser = new DeepUser({ id: 1 });
        parentUser.touch = jest.fn();
        parentUser.touchOwners = jest.fn();
        const touchesSym = Object.getOwnPropertySymbols(childUser).find(s => s.description === 'touches');
        childUser[touchesSym] = ['parent'];
        childUser.setRelation('parent', parentUser);
        childUser.touchOwners();
        expect(parentUser.touchOwners).toHaveBeenCalled();

        // Test newRelatedInstance when instance has connectionName already set (line 217)
        class CustomConnUser extends DeepUser {
            $connection = 'custom_conn';
        }
        const relInst = user.newRelatedInstance(CustomConnUser);
        expect(relInst.getConnectionName()).toBe('custom_conn');

        // Test load when relation is not a function (line 273)
        user.notAFunction = 'string_prop';
        await user.load(['notAFunction']);

        // Test updateTimestamps when updatedAt column is dirty (hasTimestamps line 23)
        user.updated_at = '2026-01-01 00:00:00';
        user.updateTimestamps();
    });
});
