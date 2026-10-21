'use strict';
/**
 * Tests targeting uncovered lines in:
 *  - eloquent/relations/relation.js                       (63%)
 *  - eloquent/relations/hasOne.js                         (61%)
 *  - eloquent/relations/hasOneOrMany.js                   (69%)
 *  - eloquent/relations/hasMany.js                        (83%)
 *  - eloquent/relations/belongsTo.js                      (59%)
 *  - eloquent/relations/belongsToMany.js                  (52%)
 *  - eloquent/relations/hasManyThrough.js                 (46%)
 *  - eloquent/relations/hasOneThrough.js                  (90%)
 *  - eloquent/relations/concerns/canBeOneOfMany.js        (60%)
 *  - eloquent/relations/concerns/interactsWithDictionary.js (78%)
 *  - eloquent/relations/concerns/interactsWithPivotTable.js (66%)
 *  - eloquent/relations/concerns/supportsDefaultModels.js (100%-already)
 *  - eloquent/concern/queriesRelationships.js             (41%)
 *  - eloquent/concern/hasRelationships.js                 (83%)
 */
const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;

// ──────────────────────────────────────────────────────
//  Model definitions
// ──────────────────────────────────────────────────────
class Country extends Model {
    $table    = 'ext_countries';
    $fillable = ['name', 'code'];

    users()    { return this.hasMany(ExtUser, 'country_id'); }
    posts()    { return this.hasManyThrough(ExtPost, ExtUser, 'country_id', 'ext_user_id'); }
    latestPost() { return this.hasOneThrough(ExtPost, ExtUser, 'country_id', 'ext_user_id').latest('ext_posts.id'); }
    profile()  { return this.hasOneThrough(ExtProfile, ExtUser, 'country_id', 'ext_user_id'); }
}

class ExtUser extends Model {
    $table    = 'ext_users';
    $fillable = ['id', 'country_id', 'name', 'email', 'age'];

    country()  { return this.belongsTo(Country, 'country_id'); }
    profile()  { return this.hasOne(ExtProfile, 'ext_user_id'); }
    posts()    { return this.hasMany(ExtPost, 'ext_user_id'); }
    roles()    { return this.belongsToMany(ExtRole, 'ext_role_user', 'user_id', 'role_id'); }
    comments() { return this.hasManyThrough(ExtComment, ExtPost, 'ext_user_id', 'ext_post_id'); }
}

class ExtProfile extends Model {
    $table    = 'ext_profiles';
    $fillable = ['ext_user_id', 'bio', 'website'];

    user()    { return this.belongsTo(ExtUser, 'ext_user_id'); }
}

class ExtPost extends Model {
    $table    = 'ext_posts';
    $fillable = ['ext_user_id', 'title', 'body', 'views'];

    user()     { return this.belongsTo(ExtUser, 'ext_user_id'); }
    comments() { return this.hasMany(ExtComment); }
}

class ExtComment extends Model {
    $table    = 'ext_comments';
    $fillable = ['ext_post_id', 'body', 'rating'];

    post() { return this.belongsTo(ExtPost, 'ext_post_id'); }
}

class ExtRole extends Model {
    $table    = 'ext_roles';
    $fillable = ['name', 'level'];

    users() { return this.belongsToMany(ExtUser, 'ext_role_user', 'role_id', 'user_id'); }
}

// ──────────────────────────────────────────────────────
describe('Eloquent Relations – Extended Coverage', () => {

    let db, conn, schema;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db     = setup.db;
        conn   = db.connection('sqlite');
        schema = conn.getSchemaBuilder();

        await schema.dropTableIfExists('ext_comments');
        await schema.dropTableIfExists('ext_role_user');
        await schema.dropTableIfExists('ext_roles');
        await schema.dropTableIfExists('ext_posts');
        await schema.dropTableIfExists('ext_profiles');
        await schema.dropTableIfExists('ext_users');
        await schema.dropTableIfExists('ext_countries');

        await schema.createTable('ext_countries', t => {
            t.increments('id'); t.string('name'); t.string('code').nullable(); t.timestamps();
        });
        await schema.createTable('ext_users', t => {
            t.increments('id'); t.integer('country_id').nullable();
            t.string('name'); t.string('email').unique(); t.integer('age').nullable(); t.timestamps();
        });
        await schema.createTable('ext_profiles', t => {
            t.increments('id'); t.integer('ext_user_id'); t.string('bio').nullable();
            t.string('website').nullable(); t.timestamps();
        });
        await schema.createTable('ext_posts', t => {
            t.increments('id'); t.integer('ext_user_id'); t.string('title');
            t.text('body').nullable(); t.integer('views').defaultTo(0); t.timestamps();
        });
        await schema.createTable('ext_comments', t => {
            t.increments('id'); t.integer('ext_post_id'); t.text('body');
            t.integer('rating').defaultTo(0); t.timestamps();
        });
        await schema.createTable('ext_roles', t => {
            t.increments('id'); t.string('name'); t.integer('level').defaultTo(1); t.timestamps();
        });
        await schema.createTable('ext_role_user', t => {
            t.increments('id'); t.integer('user_id'); t.integer('role_id');
            t.string('level').nullable(); t.timestamps();
        });
    });

    afterAll(async () => {
        await schema.dropTableIfExists('ext_comments');
        await schema.dropTableIfExists('ext_role_user');
        await schema.dropTableIfExists('ext_roles');
        await schema.dropTableIfExists('ext_posts');
        await schema.dropTableIfExists('ext_profiles');
        await schema.dropTableIfExists('ext_users');
        await schema.dropTableIfExists('ext_countries');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('ext_comments').delete();
        await conn.table('ext_role_user').delete();
        await conn.table('ext_roles').delete();
        await conn.table('ext_posts').delete();
        await conn.table('ext_profiles').delete();
        await conn.table('ext_users').delete();
        await conn.table('ext_countries').delete();
    });

    // ────────────────────────────────────────────
    //  hasOne extras
    // ────────────────────────────────────────────
    describe('hasOne extras', () => {

        test('hasOne getResults() returns null when no related', async () => {
            const user = await ExtUser.create({ name: 'NoProfile', email: 'np@test.com' });
            const profile = await user.profile().first();
            expect(profile).toBeNull();
        });

        test('hasOne save() associates and persists related model', async () => {
            const user    = await ExtUser.create({ name: 'SaveProfile', email: 'sp@test.com' });
            const profile = new ExtProfile({ bio: 'Saved Bio' });
            await user.profile().save(profile);

            const loaded = await user.profile().first();
            expect(loaded).not.toBeNull();
            expect(loaded.bio).toBe('Saved Bio');
            expect(loaded.ext_user_id).toBe(user.id);
        });

        test('hasOne with eager loading returns single related model', async () => {
            const user = await ExtUser.create({ name: 'Eager1', email: 'e1@test.com' });
            await ExtProfile.create({ ext_user_id: user.id, bio: 'EagerBio' });

            const loaded = await ExtUser.with('profile').where('id', user.id).first();
            expect(loaded.relation('profile')).not.toBeNull();
            expect(loaded.relation('profile').bio).toBe('EagerBio');
        });

        test('hasOne update() modifies the related model', async () => {
            const user = await ExtUser.create({ name: 'UpdateProfile', email: 'up@test.com' });
            await ExtProfile.create({ ext_user_id: user.id, bio: 'OldBio' });

            await user.profile().update({ bio: 'NewBio' });
            const profile = await user.profile().first();
            expect(profile.bio).toBe('NewBio');
        });

        test('hasOne getRelationExistenceQuery() for whereHas', async () => {
            const u1 = await ExtUser.create({ name: 'HasProfile', email: 'hp@test.com' });
            const u2 = await ExtUser.create({ name: 'NoProfile2', email: 'np2@test.com' });
            await ExtProfile.create({ ext_user_id: u1.id, bio: 'Bio' });

            const result = await ExtUser.has('profile').get();
            expect(result.pluck('name').all()).toContain('HasProfile');
            expect(result.pluck('name').all()).not.toContain('NoProfile2');
        });

        test('hasOne newRelatedInstanceFor() and getRelatedKeyFrom()', () => {
            const user = new ExtUser({ id: 50 });
            const rel = user.profile();
            const related = rel.newRelatedInstanceFor(user);
            expect(related).toBeInstanceOf(ExtProfile);
            expect(rel.getRelatedKeyFrom(new ExtProfile({ ext_user_id: 99 }))).toBe(99);
        });

        test('hasOne one-of-many subquery helpers', () => {
            const user = new ExtUser({ id: 10 });
            const rel = user.profile();
            expect(rel.getOneOfManySubQuerySelectColumns()).toBe('ext_profiles.ext_user_id');
        });
    });

    // ────────────────────────────────────────────
    //  hasMany extras
    // ────────────────────────────────────────────
    describe('hasMany extras', () => {

        test('withCount() and withMax() aggregate subqueries', () => {
            const query = ExtUser.withCount('posts')
                .withMax('posts', 'views')
                .withSum('posts', 'views')
                .withAvg('posts', 'views')
                .withExists('posts')
                .withMin('posts', 'views');

            expect(query).toBeDefined();
        });

        test('throws RelationNotFoundException when querying non-existent relation', () => {
            expect(() => {
                ExtUser.has('nonExistentRelation');
            }).toThrow();
        });

        test('hasMany delete() removes all related', async () => {
            const user = await ExtUser.create({ name: 'DelPosts', email: 'dp@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Post1' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Post2' });

            await user.posts().delete();
            const remaining = await user.posts().get();
            expect(remaining.count()).toBe(0);
        });

        test('hasMany update() updates all related', async () => {
            const user = await ExtUser.create({ name: 'UpdPosts', email: 'udp@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Post A', views: 0 });
            await ExtPost.create({ ext_user_id: user.id, title: 'Post B', views: 0 });

            await user.posts().update({ views: 100 });
            const posts = await user.posts().get();
            posts.forEach(p => expect(p.views).toBe(100));
        });

        test('hasMany count() returns number of related', async () => {
            const user = await ExtUser.create({ name: 'CntPosts', email: 'cp@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'P1' });
            await ExtPost.create({ ext_user_id: user.id, title: 'P2' });
            await ExtPost.create({ ext_user_id: user.id, title: 'P3' });

            const cnt = await user.posts().count();
            expect(cnt).toBe(3);
        });

        test('hasMany with constraint in eager load', async () => {
            const user = await ExtUser.create({ name: 'FilterPosts', email: 'fp@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Featured', views: 500 });
            await ExtPost.create({ ext_user_id: user.id, title: 'Regular', views: 5 });

            const result = await ExtUser.with({
                posts: q => q.where('views', '>', 100)
            }).where('id', user.id).first();

            expect(result.relation('posts').count()).toBe(1);
            expect(result.relation('posts').first().title).toBe('Featured');
        });

        test('saveMany() creates multiple related models', async () => {
            const user = await ExtUser.create({ name: 'SaveMany', email: 'sm@test.com' });
            await user.posts().saveMany([
                new ExtPost({ title: 'Saved1' }),
                new ExtPost({ title: 'Saved2' }),
            ]);

            const posts = await user.posts().get();
            expect(posts.count()).toBe(2);
        });

        test('createMany() and makeMany() on hasMany', async () => {
            const user = await ExtUser.create({ name: 'CreateManyUser', email: 'cmu@test.com' });
            const created = await user.posts().createMany([
                { title: 'CM1', views: 10 },
                { title: 'CM2', views: 20 },
            ]);
            expect(created.count()).toBe(2);
            expect(created.first().ext_user_id).toBe(user.id);

            const userInst = new ExtUser({ id: 88 });
            const madeMany = userInst.posts().makeMany([
                { title: 'Made1' },
                { title: 'Made2' },
            ]);
            expect(madeMany.count()).toBe(2);
            expect(userInst.posts().getLocalKeyName()).toBe('id');
        });

        test('self-referencing hasMany getRelationExistenceQueryForSelfRelation', async () => {
            const u1 = await ExtUser.create({ country_id: null, name: 'ParentUser', email: 'pu@test.com' });
            const u2 = await ExtUser.create({ country_id: u1.id, name: 'ChildUser', email: 'cu@test.com' });

            ExtUser.prototype.children = function() {
                return this.hasMany(ExtUser, 'country_id');
            };

            const withChildren = await ExtUser.has('children').get();
            expect(withChildren.pluck('name').all()).toContain('ParentUser');
            expect(withChildren.pluck('name').all()).not.toContain('ChildUser');
        });
    });

    // ────────────────────────────────────────────
    //  belongsTo extras
    // ────────────────────────────────────────────
    describe('belongsTo extras', () => {

        test('belongsTo with() eager loads parent', async () => {
            const country = await Country.create({ name: 'India', code: 'IN' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Ravi', email: 'ravi@test.com' });

            const loadedPost = await ExtPost.create({ ext_user_id: user.id, title: 'Indian Post' });
            const p = await ExtPost.with('user').where('id', loadedPost.id).first();
            expect(p.relation('user')).not.toBeNull();
            expect(p.relation('user').name).toBe('Ravi');
        });

        test('belongsTo getResults() returns null when foreign key is null', async () => {
            const post = new ExtPost({ ext_user_id: null, title: 'Orphan' });
            const user = await post.user().first();
            expect(user).toBeNull();
        });

        test('belongsTo getForeignKeyName() and getOwnerKeyName()', () => {
            const user   = new ExtUser();
            const rel    = user.country();
            expect(rel.getForeignKeyName()).toBe('country_id');
            expect(rel.getOwnerKeyName()).toBe('id');
        });

        test('belongsTo withDefault() returns default model instance', async () => {
            const post = new ExtPost({ ext_user_id: null, title: 'Orphan' });
            const defaultUser = await post.user().withDefault({ name: 'Guest' }).getResults();
            expect(defaultUser.name).toBe('Guest');
        });

        test('belongsTo withDefault() with callback', async () => {
            const post = new ExtPost({ ext_user_id: null, title: 'Orphan2' });
            const defaultUser = await post.user().withDefault((parent) => {
                return { name: 'Anonymous', ext_post_id: parent.id };
            }).getResults();
            expect(defaultUser.name).toBe('Anonymous');
        });

        test('belongsTo chained query constraints', async () => {
            const user = await ExtUser.create({ name: 'QueryChain', email: 'qc@test.com', age: 25 });
            const post = await ExtPost.create({ ext_user_id: user.id, title: 'Chain Post' });

            const found = await post.user().where('age', 25).first();
            expect(found).not.toBeNull();

            const notFound = await post.user().where('age', 99).first();
            expect(notFound).toBeNull();
        });

        test('belongsTo getters and key helpers', () => {
            const post = new ExtPost({ id: 10, ext_user_id: 5 });
            const rel  = post.user();
            expect(rel.getChild().getAttribute('ext_user_id')).toBe(5);
            expect(rel.getParentKey()).toBe(5);
            expect(rel.getQualifiedOwnerKeyName()).toBe('ext_users.id');
            expect(rel.getRelatedKeyFrom(new ExtUser({ id: 99 }))).toBe(99);
            expect(rel.newRelatedInstanceFor(post)).toBeInstanceOf(ExtUser);
        });
    });

    // ────────────────────────────────────────────
    //  belongsToMany extras
    // ────────────────────────────────────────────
    describe('belongsToMany extras', () => {

        test('withPivot() exposes pivot attributes on results', async () => {
            const user = await ExtUser.create({ name: 'PivotUser', email: 'pv@test.com' });
            const role = await ExtRole.create({ name: 'Moderator', level: 2 });
            await conn.table('ext_role_user').insert({
                user_id: user.id, role_id: role.id, level: 'senior'
            });

            const roles = await user.roles().withPivot('level').get();
            expect(roles.first().pivot.level).toBe('senior');
        });

        test('updateExistingPivot() updates a pivot attribute', async () => {
            const user = await ExtUser.create({ name: 'UpdatePivot', email: 'upv@test.com' });
            const role = await ExtRole.create({ name: 'Editor', level: 1 });
            await user.roles().attach(role.id, { level: 'junior' });

            await user.roles().updateExistingPivot(role.id, { level: 'senior' });
            const rows = await conn.table('ext_role_user').where('user_id', user.id).get();
            expect(rows[0].level).toBe('senior');
        });

        test('syncWithoutDetaching() adds without removing existing', async () => {
            const user  = await ExtUser.create({ name: 'SyncND', email: 'snd@test.com' });
            const role1 = await ExtRole.create({ name: 'A' });
            const role2 = await ExtRole.create({ name: 'B' });
            await user.roles().attach(role1.id);
            await user.roles().syncWithoutDetaching([role2.id]);

            const roles = await user.roles().get();
            expect(roles.count()).toBe(2);
        });

        test('wherePivot() and wherePivotIn() filter by pivot columns', async () => {
            const user  = await ExtUser.create({ name: 'FilterPivot', email: 'fpvt@test.com' });
            const role1 = await ExtRole.create({ name: 'Gold' });
            const role2 = await ExtRole.create({ name: 'Silver' });
            await conn.table('ext_role_user').insert([
                { user_id: user.id, role_id: role1.id, level: 'gold' },
                { user_id: user.id, role_id: role2.id, level: 'silver' }
            ]);

            const gold = await user.roles().withPivot('level').wherePivot('level', '=', 'gold').get();
            expect(gold.count()).toBe(1);
            expect(gold.first().name).toBe('Gold');

            const either = await user.roles().withPivot('level').wherePivotIn('level', ['gold', 'silver']).get();
            expect(either.count()).toBe(2);
        });

        test('wherePivotNotIn() excludes pivot values', async () => {
            const user  = await ExtUser.create({ name: 'NotInPivot', email: 'nip@test.com' });
            const role1 = await ExtRole.create({ name: 'Admin' });
            const role2 = await ExtRole.create({ name: 'User' });
            await conn.table('ext_role_user').insert([
                { user_id: user.id, role_id: role1.id, level: 'high' },
                { user_id: user.id, role_id: role2.id, level: 'low' }
            ]);

            const result = await user.roles().withPivot('level').wherePivotNotIn('level', ['high']).get();
            expect(result.count()).toBe(1);
            expect(result.first().name).toBe('User');
        });

        test('toggle() attaches detached and detaches attached records', async () => {
            const user  = await ExtUser.create({ name: 'ToggleUser', email: 'tu@test.com' });
            const role1 = await ExtRole.create({ name: 'Toggle1' });
            const role2 = await ExtRole.create({ name: 'Toggle2' });
            await user.roles().attach(role1.id);

            const changes = await user.roles().toggle([role1.id, role2.id]);
            expect(changes.detached).toBeDefined();
            expect(changes.attached).toBeDefined();

            const roles = await user.roles().get();
            expect(roles.pluck('name').all()).toContain('Toggle2');
            expect(roles.pluck('name').all()).not.toContain('Toggle1');
        });

        test('syncWithPivotValues() syncs with extra pivot data', async () => {
            const user  = await ExtUser.create({ name: 'SyncValUser', email: 'svu@test.com' });
            const role1 = await ExtRole.create({ name: 'Role1' });
            const role2 = await ExtRole.create({ name: 'Role2' });

            await user.roles().syncWithPivotValues([role1.id, role2.id], { level: 'manager' });
            const rows = await conn.table('ext_role_user').where('user_id', user.id).get();
            expect(rows.length).toBe(2);
            expect(rows[0].level).toBe('manager');
            expect(rows[1].level).toBe('manager');
        });

        test('detach() removes specified related records or all when empty', async () => {
            const user  = await ExtUser.create({ name: 'DetachUser', email: 'du@test.com' });
            const role1 = await ExtRole.create({ name: 'R1' });
            const role2 = await ExtRole.create({ name: 'R2' });
            await user.roles().attach([role1.id, role2.id]);

            await user.roles().detach(role1.id);
            let roles = await user.roles().get();
            expect(roles.count()).toBe(1);

            await user.roles().detach();
            roles = await user.roles().get();
            expect(roles.count()).toBe(0);
        });

        test('withTimestamps() and BelongsToMany key/table getters', () => {
            const user = new ExtUser({ id: 1 });
            const rel  = user.roles().withTimestamps('created_at', 'updated_at');
            expect(rel.getTable()).toBe('ext_role_user');
            expect(rel.getForeignPivotKeyName()).toBe('user_id');
            expect(rel.getQualifiedForeignPivotKeyName()).toBe('ext_role_user.user_id');
            expect(rel.getRelatedPivotKeyName()).toBe('role_id');
            expect(rel.getQualifiedRelatedPivotKeyName()).toBe('ext_role_user.role_id');
            expect(rel.getParentKeyName()).toBe('id');
            expect(rel.getQualifiedParentKeyName()).toBe('ext_users.id');
            expect(rel.getRelatedKeyName()).toBe('id');
            expect(rel.getQualifiedRelatedKeyName()).toBe('ext_roles.id');
            expect(rel.getPivotAccessor()).toBe('pivot');
            expect(rel.getPivotColumns()).toContain('created_at');
            expect(rel.getPivotColumns()).toContain('updated_at');
            expect(rel.getRelationName()).toBe('roles');
            expect(rel.getExistenceCompareKey()).toBe('ext_role_user.user_id');
        });

        test('create() and saveMany() on belongsToMany', async () => {
            const user = await ExtUser.create({ name: 'BTMCreateUser', email: 'btmcu@test.com' });
            const createdRole = await user.roles().create({ name: 'CreatedRole' }, { level: 'top' });
            expect(createdRole).toBeDefined();

            const savedRoles = await user.roles().saveMany([
                new ExtRole({ name: 'SavedRole1' }),
                new ExtRole({ name: 'SavedRole2' }),
            ]);
            expect(savedRoles.length).toBe(2);

            const allRoles = await user.roles().get();
            expect(allRoles.count()).toBeGreaterThanOrEqual(3);
        });
    });

    // ────────────────────────────────────────────
    //  hasManyThrough extras
    // ────────────────────────────────────────────
    describe('hasManyThrough extras', () => {

        test('hasManyThrough first() returns the first result', async () => {
            const country = await Country.create({ name: 'Japan', code: 'JP' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Taro', email: 'taro@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'JP Post 1' });

            const post = await country.posts().first();
            expect(post).not.toBeNull();
            expect(post.title).toBe('JP Post 1');
        });

        test('hasManyThrough count() returns correct count', async () => {
            const country = await Country.create({ name: 'France', code: 'FR' });
            const u1 = await ExtUser.create({ country_id: country.id, name: 'Pierre', email: 'pierre@test.com' });
            const u2 = await ExtUser.create({ country_id: country.id, name: 'Marie', email: 'marie@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Post A' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Post B' });
            await ExtPost.create({ ext_user_id: u2.id, title: 'Post C' });

            const cnt = await country.posts().count();
            expect(cnt).toBe(3);
        });

        test('hasManyThrough with constraints filters correctly', async () => {
            const country = await Country.create({ name: 'Germany', code: 'DE' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Klaus', email: 'k@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Featured DE', views: 1000 });
            await ExtPost.create({ ext_user_id: user.id, title: 'Regular DE',  views: 5 });

            const featured = await country.posts().where('views', '>', 100).get();
            expect(featured.count()).toBe(1);
        });

        test('hasManyThrough getRelationExistenceQuery() used in whereHas', async () => {
            const c1 = await Country.create({ name: 'C1' });
            const c2 = await Country.create({ name: 'C2' });
            const u1 = await ExtUser.create({ country_id: c1.id, name: 'U1', email: 'u1c@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Post' });

            const countries = await Country.has('posts').get();
            expect(countries.pluck('name').all()).toContain('C1');
            expect(countries.pluck('name').all()).not.toContain('C2');
        });

        test('user.comments() – hasManyThrough 2 levels deep', async () => {
            const user = await ExtUser.create({ name: 'Deep', email: 'deep@test.com' });
            const post = await ExtPost.create({ ext_user_id: user.id, title: 'Deep Post' });
            await ExtComment.create({ ext_post_id: post.id, body: 'Comment 1' });
            await ExtComment.create({ ext_post_id: post.id, body: 'Comment 2' });

            const comments = await user.comments().get();
            expect(comments.count()).toBe(2);
        });

        test('hasManyThrough find() and findMany()', async () => {
            const country = await Country.create({ name: 'Italy', code: 'IT' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Marco', email: 'marco@test.com' });
            const p1      = await ExtPost.create({ ext_user_id: user.id, title: 'Rome Post' });
            const p2      = await ExtPost.create({ ext_user_id: user.id, title: 'Milan Post' });

            const foundOne = await country.posts().find(p1.id);
            expect(foundOne).not.toBeNull();
            expect(foundOne.title).toBe('Rome Post');

            const foundMany = await country.posts().findMany([p1.id, p2.id]);
            expect(foundMany.count()).toBe(2);

            const emptyMany = await country.posts().findMany([]);
            expect(emptyMany.count()).toBe(0);
        });

        test('hasManyThrough firstOrNew() returns existing or creates model instance', async () => {
            const country = await Country.create({ name: 'Brazil', code: 'BR' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Silva', email: 'silva@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Existing Post' });

            const existing = await country.posts().firstOrNew({ title: 'Existing Post' });
            expect(existing.title).toBe('Existing Post');

            const newInst = await country.posts().firstOrNew({ title: 'Nonexistent Post' });
            expect(newInst.title).toBe('Nonexistent Post');
            expect(newInst.id).toBeUndefined();
        });

        test('hasManyThrough key getters and streaming helpers', async () => {
            const country = new Country({ id: 5 });
            const rel = country.posts();
            expect(rel.getFirstKeyName()).toBe('country_id');
            expect(rel.getQualifiedFirstKeyName()).toBe('ext_users.country_id');
            expect(rel.getForeignKeyName()).toBe('ext_user_id');
            expect(rel.getQualifiedForeignKeyName()).toBe('ext_posts.ext_user_id');
            expect(rel.getLocalKeyName()).toBe('id');
            expect(rel.getQualifiedLocalKeyName()).toBe('ext_countries.id');
            expect(rel.getSecondLocalKeyName()).toBe('id');

            const prepared = rel.prepareQueryBuilder(['id', 'title']);
            expect(prepared).toBeDefined();
        });
    });

    // ────────────────────────────────────────────
    //  hasOneThrough extras
    // ────────────────────────────────────────────
    describe('hasOneThrough extras', () => {

        test('hasOneThrough first() returns single related model through intermediate', async () => {
            const country = await Country.create({ name: 'Spain', code: 'ES' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Luis', email: 'luis@test.com' });
            await ExtProfile.create({ ext_user_id: user.id, bio: 'Madrid resident' });

            const profile = await country.profile().first();
            expect(profile).not.toBeNull();
            expect(profile.bio).toBe('Madrid resident');
        });

        test('hasOneThrough count()', async () => {
            const country = await Country.create({ name: 'Portugal', code: 'PT' });
            const user    = await ExtUser.create({ country_id: country.id, name: 'Ana', email: 'ana@test.com' });
            await ExtProfile.create({ ext_user_id: user.id, bio: 'Bio' });

            const cnt = await country.profile().count();
            expect(cnt).toBe(1);
        });
    });

    // ────────────────────────────────────────────
    //  queriesRelationships extras
    // ────────────────────────────────────────────
    describe('queriesRelationships extras', () => {

        test('has() with count threshold (>= 2)', async () => {
            const u1 = await ExtUser.create({ name: 'ManyPosts', email: 'mp@test.com' });
            const u2 = await ExtUser.create({ name: 'FewPosts',  email: 'fp@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'P1' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'P2' });
            await ExtPost.create({ ext_user_id: u2.id, title: 'P3' });

            const result = await ExtUser.has('posts', '>=', 2).get();
            expect(result.pluck('name').all()).toContain('ManyPosts');
            expect(result.pluck('name').all()).not.toContain('FewPosts');
        });

        test('orHas() adds an OR condition for relation existence', async () => {
            const u1 = await ExtUser.create({ name: 'HasPost',    email: 'hap@test.com' });
            const u2 = await ExtUser.create({ name: 'HasProfile', email: 'hpr@test.com' });
            const u3 = await ExtUser.create({ name: 'HasNothing', email: 'hn@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Post' });
            await ExtProfile.create({ ext_user_id: u2.id, bio: 'Bio' });

            const result = await ExtUser.has('posts').orHas('profile').get();
            const names = result.pluck('name').all();
            expect(names).toContain('HasPost');
            expect(names).toContain('HasProfile');
            expect(names).not.toContain('HasNothing');
        });

        test('doesntHave() and orDoesntHave() filter absence', async () => {
            const u1 = await ExtUser.create({ name: 'WithPost',    email: 'wp@test.com' });
            const u2 = await ExtUser.create({ name: 'WithoutPost', email: 'wop@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Post' });

            const noPost = await ExtUser.doesntHave('posts').get();
            expect(noPost.pluck('name').all()).toContain('WithoutPost');
            expect(noPost.pluck('name').all()).not.toContain('WithPost');
        });

        test('whereDoesntHave() with callback constraint', async () => {
            const u1 = await ExtUser.create({ name: 'AllPosts',  email: 'ap@test.com' });
            const u2 = await ExtUser.create({ name: 'NoPosts',   email: 'np@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Nice Post',  views: 200 });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Trash Post', views: 1   });

            const result = await ExtUser.whereDoesntHave('posts', q => {
                q.where('views', '>', 100);
            }).get();
            expect(result.pluck('name').all()).toContain('NoPosts');
            expect(result.pluck('name').all()).not.toContain('AllPosts');
        });

        test('orWhereHas() adds OR condition with callback', async () => {
            const u1 = await ExtUser.create({ name: 'ActiveUser', email: 'au@test.com' });
            const u2 = await ExtUser.create({ name: 'BioUser',    email: 'bu@test.com' });
            const u3 = await ExtUser.create({ name: 'None',       email: 'none@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'Featured', views: 999 });
            await ExtProfile.create({ ext_user_id: u2.id, bio: 'Known' });

            const result = await ExtUser
                .whereHas('posts', q => q.where('views', '>', 500))
                .orWhereHas('profile', q => q.where('bio', 'Known'))
                .get();

            const names = result.pluck('name').all();
            expect(names).toContain('ActiveUser');
            expect(names).toContain('BioUser');
            expect(names).not.toContain('None');
        });

        test('orWhereDoesntHave() adds OR absence condition', async () => {
            const u1 = await ExtUser.create({ name: 'NoPost', email: 'npd@test.com' });
            const u2 = await ExtUser.create({ name: 'WithPost', email: 'wpd@test.com' });
            await ExtPost.create({ ext_user_id: u2.id, title: 'Post' });

            const result = await ExtUser.where('name', 'SomethingElse').orWhereDoesntHave('posts').get();
            expect(result.pluck('name').all()).toContain('NoPost');
        });

        test('withCount() adds count subquery to results', async () => {
            const u1 = await ExtUser.create({ name: 'MultiPost', email: 'mul@test.com' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'P1' });
            await ExtPost.create({ ext_user_id: u1.id, title: 'P2' });

            const userWithPosts = await ExtUser.where('id', u1.id).withCount('posts').first();
            expect(userWithPosts).toBeDefined();
            expect(userWithPosts.posts_count || userWithPosts.postscount || userWithPosts.getAttribute('posts_count') || userWithPosts.getAttribute('postscount')).toBeDefined();
        });

        test('hasNested() – nested dot-notation has', async () => {
            const user = await ExtUser.create({ name: 'NestUser', email: 'nu@test.com' });
            const post = await ExtPost.create({ ext_user_id: user.id, title: 'Nest Post' });
            await ExtComment.create({ ext_post_id: post.id, body: 'Nested comment' });

            const result = await ExtUser.has('posts.comments').get();
            expect(result.pluck('name').all()).toContain('NestUser');
        });

        test('canUseExistsForExistenceCheck() logic', () => {
            const _QueriesRelationships = require('../src/eloquent/concern/queriesRelationships');
            const QueriesRelationships = _QueriesRelationships.default || _QueriesRelationships;
            const qr = new QueriesRelationships();
            expect(qr.canUseExistsForExistenceCheck('>=', 1)).toBe(true);
            expect(qr.canUseExistsForExistenceCheck('<', 1)).toBe(true);
            expect(qr.canUseExistsForExistenceCheck('>=', 2)).toBe(false);
            expect(qr.canUseExistsForExistenceCheck('>', 1)).toBe(false);
        });
    });

    // ────────────────────────────────────────────
    //  Relation base class extras
    // ────────────────────────────────────────────
    describe('Relation base class extras', () => {

        test('noConstraints() disables and re-enables relation constraints', () => {
            const _Relation = require('../src/eloquent/relations/relation');
            const Relation = _Relation.default || _Relation;
            let flag = false;
            Relation.noConstraints(() => { flag = true; });
            expect(flag).toBe(true);
        });

        test('getRelationCountHash() returns unique alias string', () => {
            const user = new ExtUser({ id: 1 });
            const rel  = user.posts();
            const hash = rel.getRelationCountHash();
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(0);
        });

        test('getRelated() returns the related model instance', () => {
            const user = new ExtUser({ id: 1 });
            const rel  = user.posts();
            expect(rel.getRelated()).toBeInstanceOf(ExtPost);
        });

        test('getParent() returns the parent model instance', () => {
            const user = new ExtUser({ id: 1 });
            const rel  = user.posts();
            expect(rel.getParent()).toBeInstanceOf(ExtUser);
        });

        test('getQualifiedForeignKeyName() returns table-qualified key', () => {
            const user = new ExtUser({ id: 1 });
            const rel  = user.posts();
            const fk   = rel.getQualifiedForeignKeyName();
            expect(fk).toContain('ext_posts');
            expect(fk).toContain('ext_user_id');
        });
    });

    // ────────────────────────────────────────────
    //  hasRelationships concern extras
    // ────────────────────────────────────────────
    describe('hasRelationships concern extras', () => {

        test('relation() stores and retrieves loaded relation', () => {
            const user = new ExtUser({ id: 1, name: 'Test' });
            const post = new ExtPost({ id: 10, title: 'P' });
            user.setRelation('posts', post);
            expect(user.relation('posts')).toBe(post);
        });

        test('unsetRelation() removes a loaded relation', () => {
            const user = new ExtUser({ id: 1 });
            user.setRelation('posts', []);
            user.unsetRelation('posts');
            expect(user.relation('posts')).toBeUndefined();
        });

        test('relationLoaded() checks if relation has been loaded', () => {
            const user = new ExtUser({ id: 1 });
            expect(user.existsRelation('posts')).toBe(false);
            user.setRelation('posts', []);
            expect(user.existsRelation('posts')).toBe(true);
        });

        test('getRelations() returns all loaded relations', () => {
            const user = new ExtUser({ id: 1 });
            user.setRelation('posts', []);
            const rels = user.getRelations();
            expect(rels).toHaveProperty('posts');
        });

        test('setRelations() bulk-sets relations', () => {
            const user = new ExtUser({ id: 1 });
            user.setRelations({ posts: [], profile: null });
            expect(user.existsRelation('posts')).toBe(true);
            expect(user.existsRelation('profile')).toBe(false);
        });

        test('with() followed by get() eager loads all specified relations', async () => {
            const user = await ExtUser.create({ name: 'EagerMulti', email: 'em@test.com' });
            await ExtProfile.create({ ext_user_id: user.id, bio: 'MultiEager' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Eager Post' });

            const loaded = await ExtUser.with(['profile', 'posts']).where('id', user.id).first();
            expect(loaded.existsRelation('profile')).toBe(true);
            expect(loaded.existsRelation('posts')).toBe(true);
        });

        test('load() lazy loads a relation on an existing model', async () => {
            const user = await ExtUser.create({ name: 'LazyLoad', email: 'll@test.com' });
            await ExtPost.create({ ext_user_id: user.id, title: 'Lazy Post' });

            const found = await ExtUser.find(user.id);
            expect(found.existsRelation('posts')).toBe(false);
            await found.load('posts');
            expect(found.existsRelation('posts')).toBe(true);

            const without = found.withoutRelations();
            expect(without.existsRelation('posts')).toBe(false);

            found.setTouchedRelations(['profile']);
            expect(found.getTouchedRelations()).toEqual(['profile']);
            expect(found.touches('profile')).toBe(true);
            expect(found.touches('unknown')).toBe(false);
            expect(found.joiningTableSegment()).toBe('ext_user');
        });
    });

    // ────────────────────────────────────────────
    //  Collection relation helpers
    // ────────────────────────────────────────────
    describe('Collection relation helpers', () => {

        test('Collection forEach() iterates all items', async () => {
            await ExtUser.create({ name: 'U1', email: 'coll1@test.com' });
            await ExtUser.create({ name: 'U2', email: 'coll2@test.com' });

            const users = await ExtUser.whereIn('email', ['coll1@test.com', 'coll2@test.com']).get();
            let count = 0;
            users.forEach(() => count++);
            expect(count).toBeGreaterThanOrEqual(2);
        });

        test('Collection map() transforms items', async () => {
            await ExtUser.create({ name: 'MapUser', email: 'mu@test.com' });
            const users = await ExtUser.where('name', 'MapUser').get();
            const names = users.map(u => u.name.toLowerCase()).all();
            expect(names).toContain('mapuser');
        });

        test('Collection filter() and reject() work correctly', async () => {
            await ExtUser.create({ name: 'OldUser', email: 'ou@test.com', age: 60 });
            await ExtUser.create({ name: 'YoungUser', email: 'yu@test.com', age: 20 });

            const users = await ExtUser.whereIn('name', ['OldUser', 'YoungUser']).get();
            const old = users.filter(u => u.age >= 50);
            expect(old.count()).toBe(1);

            const young = users.reject(u => u.age >= 50);
            expect(young.count()).toBe(1);
        });

        test('Collection sortBy() orders items', async () => {
            await ExtUser.create({ name: 'Zebra', email: 'z@test.com', age: 50 });
            await ExtUser.create({ name: 'Apple', email: 'a@test.com', age: 20 });

            const users = await ExtUser.whereIn('name', ['Zebra', 'Apple']).get();
            const sorted = users.sortBy('name');
            expect(sorted.first().name).toBe('Apple');
        });
    });

});
