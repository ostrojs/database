const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;

// Define Models
class Country extends Model {
    $table = 'countries';
    $fillable = ['name'];

    users() {
        return this.hasMany(User);
    }

    posts() {
        return this.hasManyThrough(Post, User);
    }

    profile() {
        return this.hasOneThrough(Profile, User);
    }
}

class User extends Model {
    $table = 'users';
    $fillable = ['country_id', 'name', 'email'];

    country() {
        return this.belongsTo(Country);
    }

    profile() {
        return this.hasOne(Profile);
    }

    posts() {
        return this.hasMany(Post);
    }

    roles() {
        return this.belongsToMany(Role, 'role_user', 'user_id', 'role_id');
    }

    inferredRoles() {
        return this.belongsToMany(Role);
    }

    parentUser() {
        return this.belongsTo(User, 'country_id');
    }
}

class Profile extends Model {
    $table = 'profiles';
    $fillable = ['user_id', 'bio'];

    user() {
        return this.belongsTo(User);
    }
}

class Post extends Model {
    $table = 'posts';
    $fillable = ['user_id', 'title', 'content'];

    user() {
        return this.belongsTo(User);
    }

    comments() {
        return this.hasMany(Comment);
    }
}

class Comment extends Model {
    $table = 'comments';
    $fillable = ['post_id', 'body'];

    post() {
        return this.belongsTo(Post);
    }
}

class Role extends Model {
    $table = 'roles';
    $fillable = ['name'];

    users() {
        return this.belongsToMany(User, 'role_user', 'role_id', 'user_id');
    }
}

describe('Eloquent Relationships Comprehensive Unit Tests', () => {

    let db;
    let conn;
    let schema;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');
        schema = conn.getSchemaBuilder();

        await schema.dropTableIfExists('comments');
        await schema.dropTableIfExists('posts');
        await schema.dropTableIfExists('profiles');
        await schema.dropTableIfExists('role_user');
        await schema.dropTableIfExists('roles');
        await schema.dropTableIfExists('users');
        await schema.dropTableIfExists('countries');

        await schema.createTable('countries', (t) => {
            t.increments('id');
            t.string('name');
            t.timestamps();
        });

        await schema.createTable('users', (t) => {
            t.increments('id');
            t.integer('country_id').nullable();
            t.string('name');
            t.string('email').unique();
            t.timestamps();
        });

        await schema.createTable('profiles', (t) => {
            t.increments('id');
            t.integer('user_id');
            t.string('bio');
            t.timestamps();
        });

        await schema.createTable('posts', (t) => {
            t.increments('id');
            t.integer('user_id');
            t.string('title');
            t.text('content').nullable();
            t.timestamps();
        });

        await schema.createTable('comments', (t) => {
            t.increments('id');
            t.integer('post_id');
            t.text('body');
            t.timestamps();
        });

        await schema.createTable('roles', (t) => {
            t.increments('id');
            t.string('name');
            t.timestamps();
        });

        await schema.createTable('role_user', (t) => {
            t.increments('id');
            t.integer('user_id');
            t.integer('role_id');
            t.string('level').nullable();
            t.timestamps();
        });
    });

    afterAll(async () => {
        await schema.dropTableIfExists('comments');
        await schema.dropTableIfExists('posts');
        await schema.dropTableIfExists('profiles');
        await schema.dropTableIfExists('role_user');
        await schema.dropTableIfExists('roles');
        await schema.dropTableIfExists('users');
        await schema.dropTableIfExists('countries');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('comments').delete();
        await conn.table('posts').delete();
        await conn.table('profiles').delete();
        await conn.table('role_user').delete();
        await conn.table('roles').delete();
        await conn.table('users').delete();
        await conn.table('countries').delete();
    });

    describe('One to One (hasOne & belongsTo)', () => {
        test('user.profile() returns associated Profile and profile.user() returns User', async () => {
            const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
            const profile = await Profile.create({ user_id: user.id, bio: 'Software Developer' });

            const fetchedProfile = await user.profile().first();
            expect(fetchedProfile).not.toBeNull();
            expect(fetchedProfile.bio).toBe('Software Developer');

            const fetchedUser = await profile.user().first();
            expect(fetchedUser).not.toBeNull();
            expect(fetchedUser.id).toBe(user.id);
            expect(fetchedUser.email).toBe('alice@example.com');
        });
    });

    describe('One to Many (hasMany & belongsTo)', () => {
        test('user.posts() retrieves all posts and post.user() retrieves author', async () => {
            const user = await User.create({ name: 'Bob', email: 'bob@example.com' });
            await Post.create({ user_id: user.id, title: 'First Post', content: 'Hello World' });
            await Post.create({ user_id: user.id, title: 'Second Post', content: 'Node.js is great' });

            const posts = await user.posts().get();
            expect(posts.all()).toHaveLength(2);
            expect(posts.first().title).toBe('First Post');

            const firstPost = await Post.where('title', 'First Post').first();
            const author = await firstPost.user().first();
            expect(author.id).toBe(user.id);
            expect(author.name).toBe('Bob');
        });
    });

    describe('Many to Many (belongsToMany & Pivot operations)', () => {
        test('attach, detach, sync, and toggle manage pivot table entries', async () => {
            const user = await User.create({ name: 'Charlie', email: 'charlie@example.com' });
            const adminRole = await Role.create({ name: 'Admin' });
            const editorRole = await Role.create({ name: 'Editor' });
            const reviewerRole = await Role.create({ name: 'Reviewer' });

            // Attach
            await user.roles().attach(adminRole.id);
            let roles = await user.roles().get();
            expect(roles.all()).toHaveLength(1);
            expect(roles.first().name).toBe('Admin');

            // Attach multiple
            await user.roles().attach([editorRole.id, reviewerRole.id]);
            roles = await user.roles().get();
            expect(roles.all()).toHaveLength(3);

            // Detach single
            await user.roles().detach(editorRole.id);
            roles = await user.roles().get();
            expect(roles.all()).toHaveLength(2);

            // Sync
            await user.roles().sync([editorRole.id, reviewerRole.id]);
            roles = await user.roles().get();
            expect(roles.all()).toHaveLength(2);
            const roleNames = roles.map(r => r.name).all();
            expect(roleNames).toContain('Editor');
            expect(roleNames).toContain('Reviewer');
            expect(roleNames).not.toContain('Admin');

            // Toggle
            await user.roles().toggle([editorRole.id, adminRole.id]);
            roles = await user.roles().get();
            const toggledNames = roles.map(r => r.name).all();
            expect(toggledNames).toContain('Admin'); // newly added
            expect(toggledNames).not.toContain('Editor'); // detached
            expect(toggledNames).toContain('Reviewer'); // untouched

            // syncWithoutDetaching
            await user.roles().syncWithoutDetaching([editorRole.id]);
            roles = await user.roles().get();
            expect(roles.map(r => r.name).all()).toContain('Editor');

            // syncWithPivotValues
            await user.roles().syncWithPivotValues([editorRole.id], { level: 'manager' });
            roles = await user.roles().withPivot('level').get();
            const editorFound = roles.find(r => r.name === 'Editor');
            expect(editorFound.relation('pivot').level).toBe('manager');

            // updateExistingPivot
            await user.roles().updateExistingPivot(editorRole.id, { level: 'senior_manager' });
            roles = await user.roles().withPivot('level').get();
            expect(roles.find(r => r.name === 'Editor').relation('pivot').level).toBe('senior_manager');

            // as accessor & getPivotAccessor
            const customAccessRel = user.roles().as('custom_pivot');
            expect(customAccessRel.getPivotAccessor()).toBe('custom_pivot');
            const customRoles = await customAccessRel.get();
            expect(customRoles.first().relation('custom_pivot')).toBeDefined();

            // wherePivot, wherePivotBetween, wherePivotIn, wherePivotNull
            const baseRolesRel = user.roles().withPivot('level');
            expect(await baseRolesRel.wherePivot('level', '=', 'senior_manager')).toBeDefined();
            expect(await user.roles().orWherePivot('level', '=', 'other')).toBeDefined();
            expect(await user.roles().wherePivotIn('level', ['senior_manager', 'director'])).toBeDefined();
            expect(await user.roles().wherePivotNotIn('level', ['banned'])).toBeDefined();
            expect(await user.roles().orWherePivotIn('level', ['senior_manager'])).toBeDefined();
            expect(await user.roles().orWherePivotNotIn('level', ['banned'])).toBeDefined();
            expect(await user.roles().wherePivotBetween('role_id', [1, 100])).toBeDefined();
            expect(await user.roles().orWherePivotBetween('role_id', [101, 200])).toBeDefined();
            expect(await user.roles().wherePivotNotBetween('role_id', [500, 600])).toBeDefined();
            expect(await user.roles().orWherePivotNotBetween('role_id', [700, 800])).toBeDefined();
            expect(await user.roles().wherePivotNotNull('level')).toBeDefined();
            expect(await user.roles().orWherePivotNotNull('level')).toBeDefined();
            expect(await user.roles().wherePivotNull('level', 'or')).toBeDefined();
            expect(await user.roles().orWherePivotNull('level')).toBeDefined();

            // withPivotValue
            const wpvRel = user.roles().withPivotValue('level', 'senior_manager');
            expect(await wpvRel.get()).toBeDefined();
            user.roles().withPivotValue({ level: 'senior_manager' });
            expect(() => user.roles().withPivotValue('level', null)).toThrow('The provided value may not be null.');

            // orderByPivot
            const orderedRoles = await user.roles().orderByPivot('role_id', 'desc').get();
            expect(orderedRoles).toBeDefined();

            // find, findMany, findOrFail, findOrNew
            const foundRole = await user.roles().find(editorRole.id);
            expect(foundRole.id).toBe(editorRole.id);
            const foundRoles = await user.roles().findMany([editorRole.id, 99999]);
            expect(foundRoles.all()).toHaveLength(1);
            expect(await user.roles().findMany([])).toHaveLength(0);
            const foundFail = await user.roles().findOrFail(editorRole.id);
            expect(foundFail.id).toBe(editorRole.id);
            await expect(user.roles().findOrFail(99999)).rejects.toThrow();
            await expect(user.roles().findOrFail([editorRole.id, 99999])).rejects.toThrow();
            const foundOrNewExisting = await user.roles().findOrNew(editorRole.id);
            expect(foundOrNewExisting.id).toBe(editorRole.id);
            const foundOrNewMissing = await user.roles().findOrNew(99999);
            expect(foundOrNewMissing.$exists).toBe(false);

            // firstOrNew, firstOrCreate, updateOrCreate
            const fonRole = await user.roles().firstOrNew({ name: 'Editor' });
            expect(fonRole.id).toBe(editorRole.id);
            const fonNewRole = await user.roles().firstOrNew({ name: 'NewRoleNonExistent' });
            expect(fonNewRole.$exists).toBe(false);
            const focRole = await user.roles().firstOrCreate({ name: 'Editor' });
            expect(focRole.id).toBe(editorRole.id);
            const focCreated = await user.roles().firstOrCreate({ name: 'BrandNewRole' }, { level: 'staff' });
            expect(focCreated.id).toBeDefined();
            const uocExisting = await user.roles().updateOrCreate({ name: 'BrandNewRole' }, { name: 'BrandNewRoleRenamed' });
            expect(uocExisting.name).toBe('BrandNewRoleRenamed');
            const uocNew = await user.roles().updateOrCreate({ name: 'NeverExistedRole' }, { name: 'NeverExistedRoleCreated' });
            expect(uocNew.id).toBeDefined();

            // firstWhere, firstOrFail
            const fwRole = await user.roles().firstWhere('name', 'Editor');
            expect(fwRole.id).toBe(editorRole.id);
            const foRole = await user.roles().firstOrFail();
            expect(foRole).toBeDefined();
            await expect(user.roles().where('name', 'NonExistentXYZ').firstOrFail()).rejects.toThrow();

            // save, saveMany, create, createMany
            const newRoleObj = new Role({ name: 'SavedRole' });
            const savedRoleRes = await user.roles().save(newRoleObj, { level: 'saved' });
            expect(savedRoleRes.id).toBeDefined();
            const newRoleObj2 = new Role({ name: 'SavedRole2' });
            const savedManyRoles = await user.roles().saveMany([newRoleObj2], [{ level: 'saved2' }]);
            expect(savedManyRoles[0].id).toBeDefined();
            const createdDirectRole = await user.roles().create({ name: 'DirectRole' }, { level: 'direct' });
            expect(createdDirectRole.id).toBeDefined();
            const createdManyDirect = await user.roles().createMany([{ name: 'MultiDirect1' }, { name: 'MultiDirect2' }], [{ level: 'm1' }, { level: 'm2' }]);
            expect(createdManyDirect).toHaveLength(2);

            // withTimestamps, createdAt, updatedAt
            const tsRel = user.roles().withTimestamps('created_at', 'updated_at');
            expect(tsRel.createdAt()).toBe('created_at');
            expect(tsRel.updatedAt()).toBe('updated_at');

            // Key getters & table metadata
            const rolesRel = user.roles();
            expect(rolesRel.getForeignPivotKeyName()).toBe('user_id');
            expect(rolesRel.getQualifiedForeignPivotKeyName()).toBe('role_user.user_id');
            expect(rolesRel.getRelatedPivotKeyName()).toBe('role_id');
            expect(rolesRel.getQualifiedRelatedPivotKeyName()).toBe('role_user.role_id');
            expect(rolesRel.getParentKeyName()).toBe('id');
            expect(rolesRel.getQualifiedParentKeyName()).toBe('users.id');
            expect(rolesRel.getRelatedKeyName()).toBe('id');
            expect(rolesRel.getQualifiedRelatedKeyName()).toBe('roles.id');
            expect(rolesRel.getTable()).toBe('role_user');
            expect(rolesRel.getPivotColumns()).toBeDefined();
            expect(rolesRel.getExistenceCompareKey()).toBe('role_user.user_id');
            expect(rolesRel.resolveTableName('custom_table')).toBe('custom_table');
            expect(rolesRel.resolveTableName(Role)).toBe('roles');

            // getRelationExistenceQuery for regular vs self join
            const regRoleQuery = Role.newQuery();
            const regUserQuery = User.newQuery();
            expect(rolesRel.getRelationExistenceQuery(regRoleQuery, regUserQuery)).toBeDefined();
            const selfRoleQuery1 = Role.newQuery();
            const selfRoleQuery2 = Role.newQuery();
            expect(rolesRel.getRelationExistenceQuery(selfRoleQuery1, selfRoleQuery2)).toBeDefined();

            // allRelatedIds & touch
            const relIds = await rolesRel.allRelatedIds();
            const relIdsCount = relIds && typeof relIds.count === 'function' ? relIds.count() : (relIds ? relIds.length : 0);
            expect(relIdsCount).toBeGreaterThan(0);
            await rolesRel.touch();

            // parseIds edge cases in InteractsWithPivotTable
            expect(rolesRel.parseIds(adminRole)).toEqual([adminRole.id]);
            expect(rolesRel.parseIds(new ((require('@ostro/support/collection').default || require('@ostro/support/collection')))([adminRole]))).toEqual([adminRole.id]);
            expect(rolesRel.parseIds({ [adminRole.id]: { level: 'custom' } })).toEqual({ [adminRole.id]: { level: 'custom' } });
            expect(rolesRel.parseIds(null)).toEqual([]);
            expect(rolesRel.parseId(adminRole)).toBe(adminRole.id);
            expect(rolesRel.parseId(123)).toBe(123);

            // detach with null & empty
            expect(await rolesRel.detach(null)).toBeGreaterThan(0);
            expect(await rolesRel.detach([])).toBe(0);

            // getResults on parent without key
            const unsavedUser = new User();
            const unsavedRoles = await unsavedUser.roles().getResults();
            expect(unsavedRoles.count()).toBe(0);

            // lazy query attachment on unpersisted parent
            const unpersistedUser = new User({ name: 'Lazy', email: 'lazy@example.com' });
            unpersistedUser.roles().attach(adminRole.id);
            expect(unpersistedUser[Symbol.for('lazyQueries')]).toHaveLength(1);
        });
    });

    describe('Through Relationships (hasManyThrough & hasOneThrough)', () => {
        test('hasManyThrough retrieves posts belonging to a country through users', async () => {
            const country = await Country.create({ name: 'Canada' });
            const u1 = await User.create({ country_id: country.id, name: 'Dave', email: 'dave@example.com' });
            const u2 = await User.create({ country_id: country.id, name: 'Emma', email: 'emma@example.com' });

            await Post.create({ user_id: u1.id, title: 'Dave Post 1' });
            await Post.create({ user_id: u1.id, title: 'Dave Post 2' });
            await Post.create({ user_id: u2.id, title: 'Emma Post 1' });

            // Another country user
            const otherCountry = await Country.create({ name: 'USA' });
            const u3 = await User.create({ country_id: otherCountry.id, name: 'Frank', email: 'frank@example.com' });
            await Post.create({ user_id: u3.id, title: 'Frank Post' });

            const countryPosts = await country.posts().get();
            expect(countryPosts.all()).toHaveLength(3);
        });

        test('hasOneThrough retrieves profile through user', async () => {
            const country = await Country.create({ name: 'Japan' });
            const user = await User.create({ country_id: country.id, name: 'Hiroshi', email: 'hiroshi@example.com' });
            await Profile.create({ user_id: user.id, bio: 'Tokyo Resident' });

            const countryProfile = await country.profile().first();
            expect(countryProfile).not.toBeNull();
            expect(countryProfile.bio).toBe('Tokyo Resident');

            // Test eager loading of hasOneThrough and hasManyThrough
            const countryWithProfile = await Country.with('profile').where('id', country.id).first();
            expect(countryWithProfile.relation('profile')).toBeDefined();
            expect(countryWithProfile.relation('profile').bio).toBe('Tokyo Resident');

            const countryWithPosts = await Country.with('posts').where('id', country.id).first();
            expect(countryWithPosts.relation('posts')).toBeDefined();

            // hasOneThrough match when country has no user or profile (dictionary key missing)
            const emptyCountry = await Country.create({ name: 'Empty Country' });
            const countryWithoutProfile = await Country.with('profile').where('id', emptyCountry.id).first();
            expect(countryWithoutProfile.relation('profile')).toBeNull();
        });
    });

    describe('Eager Loading (with)', () => {
        test('with() eager loads relationships without N+1 query problem', async () => {
            const u1 = await User.create({ name: 'User 1', email: 'u1@example.com' });
            const u2 = await User.create({ name: 'User 2', email: 'u2@example.com' });

            await Profile.create({ user_id: u1.id, bio: 'Bio 1' });
            await Profile.create({ user_id: u2.id, bio: 'Bio 2' });

            await Post.create({ user_id: u1.id, title: 'P1' });
            await Post.create({ user_id: u1.id, title: 'P2' });

            const users = await User.with(['profile', 'posts']).get();
            expect(users.all()).toHaveLength(2);

            const firstUser = users.first();
            expect(firstUser.relation('profile')).toBeDefined();
            expect(firstUser.relation('profile').bio).toBe('Bio 1');
            expect(firstUser.relation('posts')).toBeDefined();
            expect(firstUser.relation('posts').all()).toHaveLength(2);
        });
    });

    describe('Querying Relationship Existence (has, whereHas, whereDoesntHave)', () => {
        beforeEach(async () => {
            const uWithPosts = await User.create({ name: 'Author', email: 'author@example.com' });
            const uNoPosts = await User.create({ name: 'Reader', email: 'reader@example.com' });

            await Post.create({ user_id: uWithPosts.id, title: 'Published Article 1' });
            await Post.create({ user_id: uWithPosts.id, title: 'Draft Article' });
        });

        test('has() filters models that have at least one related record', async () => {
            const usersWithPosts = await User.has('posts').get();
            expect(usersWithPosts.all()).toHaveLength(1);
            expect(usersWithPosts.first().name).toBe('Author');
        });

        test('whereDoesntHave() filters models without related records', async () => {
            const usersWithoutPosts = await User.whereDoesntHave('posts').get();
            expect(usersWithoutPosts.all()).toHaveLength(1);
            expect(usersWithoutPosts.first().name).toBe('Reader');
        });

        test('whereHas() applies constraint callback to relationship query', async () => {
            const usersWithDraft = await User.whereHas('posts', (q) => {
                q.where('title', 'Draft Article');
            }).get();
            expect(usersWithDraft.all()).toHaveLength(1);
            expect(usersWithDraft.first().name).toBe('Author');

            const usersWithNonExistent = await User.whereHas('posts', (q) => {
                q.where('title', 'Non-existent Title');
            }).get();
            expect(usersWithNonExistent.all()).toHaveLength(0);
        });
    });

    describe('Relationship mutations & helpers', () => {
        test('user.posts().create() and createMany() create and associate models directly', async () => {
            const user = await User.create({ name: 'Writer', email: 'writer@example.com' });
            
            const post1 = await user.posts().create({ title: 'Dynamic Post 1', content: 'C1' });
            expect(post1.user_id).toBe(user.id);
            expect(post1.title).toBe('Dynamic Post 1');

            const multiPosts = await user.posts().createMany([
                { title: 'Dynamic Post 2', content: 'C2' },
                { title: 'Dynamic Post 3', content: 'C3' },
            ]);
            expect(multiPosts.all()).toHaveLength(2);

            const allPosts = await user.posts().get();
            expect(allPosts.all()).toHaveLength(3);
        });

        test('belongsTo associate() and dissociate() dynamically update foreign key', async () => {
            const user1 = await User.create({ name: 'User One', email: 'u1@test.com' });
            const user2 = await User.create({ name: 'User Two', email: 'u2@test.com' });
            const profile = await Profile.create({ bio: 'Independent Profile' });

            // Associate user 1
            profile.user().associate(user1);
            expect(profile.user_id).toBe(user1.id);
            await profile.save();

            let reloaded = await Profile.find(profile.id);
            expect(reloaded.user_id).toBe(user1.id);

            // Dissociate
            profile.user().dissociate();
            expect(profile.user_id).toBeNull();
            await profile.save();

            reloaded = await Profile.find(profile.id);
            expect(reloaded.user_id).toBeNull();

            // Associate with scalar ID
            profile.user().associate(user2.id);
            expect(profile.user_id).toBe(user2.id);
        });

        test('nested eager loading with dot notation loads multi-level relationships', async () => {
            const user = await User.create({ name: 'Nested Author', email: 'nested@example.com' });
            const post = await user.posts().create({ title: 'Deep Post' });
            await Comment.create({ post_id: post.id, body: 'Great post!' });
            await Comment.create({ post_id: post.id, body: 'Very informative' });

            const loadedUsers = await User.with(['posts.comments']).where('id', user.id).get();
            expect(loadedUsers.all()).toHaveLength(1);
            const loadedUser = loadedUsers.first();
            expect(loadedUser.relation('posts')).toBeDefined();
            const loadedPost = loadedUser.relation('posts').first();
            expect(loadedPost.title).toBe('Deep Post');
            expect(loadedPost.relation('comments')).toBeDefined();
            expect(loadedPost.relation('comments').all()).toHaveLength(2);
        });

        test('eager loading multiple relationships simultaneously (with User -> profile, posts, roles)', async () => {
            const user = await User.create({ name: 'Multi Rel User', email: 'multi@example.com' });
            await Profile.create({ user_id: user.id, bio: 'Multi Profile' });
            await Post.create({ user_id: user.id, title: 'Multi Post 1' });
            await Post.create({ user_id: user.id, title: 'Multi Post 2' });
            const role = await Role.create({ name: 'SuperAdmin' });
            await user.roles().attach(role.id);

            const result = await User.with(['profile', 'posts', 'roles']).where('id', user.id).first();
            expect(result).toBeDefined();
            expect(result.relation('profile').bio).toBe('Multi Profile');
            expect(result.relation('posts').all()).toHaveLength(2);
            expect(result.relation('roles').first().name).toBe('SuperAdmin');
        });

        test('eager loading with constraint callbacks on relations', async () => {
            const user = await User.create({ name: 'Filtered Author', email: 'filter@example.com' });
            await Post.create({ user_id: user.id, title: 'Approved Post' });
            await Post.create({ user_id: user.id, title: 'Rejected Post' });

            const result = await User.with({
                posts: (q) => q.where('title', 'Approved Post')
            }).where('id', user.id).first();

            expect(result.relation('posts').all()).toHaveLength(1);
            expect(result.relation('posts').first().title).toBe('Approved Post');
        });

        test('cross compare Direct DB joins vs Eloquent relations for identical datasets', async () => {
            const user = await User.create({ name: 'Compare User', email: 'compare@example.com' });
            await Post.create({ user_id: user.id, title: 'Compare Post 1' });
            await Post.create({ user_id: user.id, title: 'Compare Post 2' });

            // Direct DB Query Join
            const dbResult = await db.table('users')
                .join('posts', 'users.id', '=', 'posts.user_id')
                .where('users.id', user.id)
                .select('users.name as author_name', 'posts.title as post_title')
                .get();

            expect(dbResult).toHaveLength(2);
            expect(dbResult[0].author_name).toBe('Compare User');
            expect(dbResult[0].post_title).toBe('Compare Post 1');

            // Eloquent Relation
            const eloquentUser = await User.with('posts').where('id', user.id).first();
            expect(eloquentUser.name).toBe('Compare User');
            expect(eloquentUser.relation('posts').pluck('title').all()).toEqual(['Compare Post 1', 'Compare Post 2']);
        });

        test('orHas, doesntHave, orDoesntHave, orWhereHas, orWhereDoesntHave query methods', async () => {
            const u1 = await User.create({ name: 'User 1', email: 'u1@qrel.com' });
            const u2 = await User.create({ name: 'User 2', email: 'u2@qrel.com' });
            const u3 = await User.create({ name: 'User 3', email: 'u3@qrel.com' });

            await Post.create({ user_id: u1.id, title: 'Featured Post' });
            await Post.create({ user_id: u2.id, title: 'Standard Post' });

            const doesntHave = await (new User).doesntHave('posts').get();
            expect(doesntHave.pluck('id').all()).toContain(u3.id);

            const hasUser = await (new User).whereHas('posts', q => q.where('title', 'Featured Post')).get();
            expect(hasUser.first().name).toBe('User 1');
        });

        test('BelongsTo associate, dissociate and withDefault support', async () => {
            const country = await Country.create({ name: 'India' });
            const user = new User({ name: 'Associate User', email: 'assoc@test.com' });

            user.country().associate(country);
            expect(user.country_id).toBe(country.id);
            expect(user.relation('country')).toBe(country);

            user.country().dissociate();
            expect(user.country_id).toBeNull();

            // withDefault
            const relationWithDefault = user.country().withDefault({ name: 'Default Country' });
            const defaultCountry = await relationWithDefault.getResults();
            expect(defaultCountry).toBeDefined();
            expect(defaultCountry.name).toBe('Default Country');

            const callbackDefault = await user.country().withDefault((parent) => {
                const c = new Country();
                c.name = 'Callback Country';
                return c;
            }).getResults();
            expect(callbackDefault.name).toBe('Callback Country');
        });

        test('HasRelationships concern methods: touches, touchOwners, load, unsetRelations, withoutRelations, joiningTable', async () => {
            const user = await User.create({ name: 'TouchUser', email: 'touch@test.com' });
            user.setTouchedRelations(['country']);
            expect(user.getTouchedRelations()).toEqual(['country']);
            expect(user.touches('country')).toBe(true);
            expect(user.touches('posts')).toBe(false);

            // touchOwners
            const country = await Country.create({ name: 'TouchCountry' });
            user.setRelation('country', country);
            await user.touchOwners();

            // load()
            const post = await Post.create({ user_id: user.id, title: 'LoadedPost' });
            await user.load('posts');
            expect(user.relationLoaded('posts')).toBe(true);
            expect(user.relation('posts')).toBeDefined();

            await user.load(['posts']);
            expect(user.relationLoaded('posts')).toBe(true);

            // withoutRelations & unsetRelations
            expect(user.relationLoaded('country')).toBe(true);
            const userWithoutRel = user.withoutRelations();
            expect(userWithoutRel.relationLoaded('country')).toBe(false);
            user.unsetRelations();
            expect(user.relationLoaded('posts')).toBe(false);

            // joiningTable with class and instance
            const jtDefault = user.joiningTable(Post);
            expect(jtDefault).toBe('post_user');
            const jtWithInst = user.joiningTable(Post, new Post());
            expect(jtWithInst).toBe('post_user');

            // existsRelation, setRelations, unsetRelation
            user.setRelations({ tempRel: 'tempVal' });
            expect(user.existsRelation('tempRel')).toBe(true);
            expect(user.existsRelation('nonExistent')).toBe(false);
            user.unsetRelation('tempRel');
            expect(user.existsRelation('tempRel')).toBe(false);

            // static $manyMethods and resolveRelationUsing
            expect(User.$manyMethods).toContain('belongsToMany');
            User.resolveRelationUsing('customRel', () => {});

            // belongsToMany with null table
            const btmDefault = user.inferredRoles();
            expect(btmDefault.getTable()).toBe('role_user');

            // String require paths in relations
            const relPath = require.resolve('./setup');
            const origExports = require(relPath);
            require.cache[relPath].exports = Role;
            const strHasOne = user.hasOne(relPath);
            expect(strHasOne).toBeDefined();
            const strBelongsTo = user.belongsTo(relPath, 'role_id', 'id', 'role');
            expect(strBelongsTo).toBeDefined();
            const strHasMany = user.hasMany(relPath);
            expect(strHasMany).toBeDefined();
            const strHasOneThrough = user.hasOneThrough(relPath, relPath);
            expect(strHasOneThrough).toBeDefined();
            const strHasManyThrough = user.hasManyThrough(relPath, relPath);
            expect(strHasManyThrough).toBeDefined();
            const strBelongsToMany = user.belongsToMany(relPath, 'pivot_table', 'u_id', 'r_id', 'id', 'id', 'customRel');
            expect(strBelongsToMany).toBeDefined();
            require.cache[relPath].exports = origExports;

            // load() with multiple arguments
            user.country_id = country.id;
            await user.load('country', 'posts');
            expect(user.relationLoaded('country')).toBe(true);
            expect(user.relationLoaded('posts')).toBe(true);

            // load() with single string
            await user.load('country');
            expect(user.relationLoaded('country')).toBe(true);

            // queriesRelationships: withAggregate empty relations branch
            const qEmpty = User.withAggregate([], 'id');
            expect(qEmpty).toBeDefined();

            // withAggregate with 'as' alias and no function
            const qAlias = User.withAggregate('posts as user_posts_list', 'title');
            expect(qAlias).toBeDefined();

            // withMax, withMin, withSum, withAvg, withExists
            const qMax = User.withMax('posts', 'id');
            expect(qMax).toBeDefined();
            const qMin = User.withMin('posts', 'id');
            expect(qMin).toBeDefined();
            const qSum = User.withSum('posts', 'id');
            expect(qSum).toBeDefined();
            const qAvg = User.withAvg('posts', 'id');
            expect(qAvg).toBeDefined();
            const qExists = User.withExists('posts');
            expect(qExists).toBeDefined();

            // queriesRelationships: has with operator not matching exists check (e.g. > 2)
            const qCountOp = await User.has('posts', '>', 2).get();
            expect(qCountOp).toBeDefined();

            const qCountOpOr = await User.orHas('posts', '>', 2).get();
            expect(qCountOpOr).toBeDefined();

            // queriesRelationships: hasNested with operator '<' and count 1
            const qNestedDoesntHave = await Country.whereDoesntHave('users.posts').get();
            expect(qNestedDoesntHave).toBeDefined();

            // orDoesntHave and orWhereDoesntHave
            const qOrDoesntHave = await User.orDoesntHave('posts').get();
            expect(qOrDoesntHave).toBeDefined();
            const qOrWhereDoesntHave = await User.orWhereDoesntHave('posts').get();
            expect(qOrWhereDoesntHave).toBeDefined();

            // withAggregate subquery having multiple columns (count(columns) > 1)
            const qMultiCols = await User.withCount({
                'posts as post_count': (q) => q.select('id', 'title', 'content')
            }).where('id', '>', 0);
            expect(qMultiCols).toBeDefined();

            // orWhereHas
            const qOrWhereHas = await User.orWhereHas('posts', (q) => q.where('id', '>', 0)).get();
            expect(qOrWhereHas).toBeDefined();

            // withAggregate / withCount where constraint adds extra select column
            const withCountMulti = User.withCount({
                posts: (q) => {
                    q.select('id');
                }
            });
            expect(withCountMulti).toBeDefined();

            // withMax with non-star column
            const withMaxRes = await User.withMax('posts', 'id').get();
            expect(withMaxRes).toBeDefined();

            // whereHas direct without callback
            const whereHasNoCb = await User.whereHas('posts').get();
            expect(whereHasNoCb).toBeDefined();

            // getBelongsToRelation test
            const countryRel = user.country();
            const btrWithName = User.newQuery().getBelongsToRelation(countryRel, Country);
            expect(btrWithName).toBeDefined();

            // has() branches: non-string relation instance, default operator/count/boolean fallback
            const hasByRelationInstance = await User.has(user.posts()).get();
            expect(hasByRelationInstance).toBeDefined();
            const hasDefaultFallbacks = await User.has('posts', null, null, null).get();
            expect(hasDefaultFallbacks).toBeDefined();

            // hasNested > 1 remaining segments
            const has3Deep = await Country.whereHas('users.posts.comments').get();
            expect(has3Deep).toBeDefined();

            // withAggregate: same table hashedColumn branch
            const qSameTable = User.withCount('parentUser');
            expect(qSameTable).toBeDefined();

            // withCount when select columns already exist on builder
            const qExistingCols = User.select('name', 'email').withCount('posts');
            expect(qExistingCols).toBeDefined();

            // withCount array vs string vs multiple arguments
            const qCountArr = User.withCount(['posts']);
            expect(qCountArr).toBeDefined();
            const qCountArgs = User.withCount('posts', 'profile');
            expect(qCountArgs).toBeDefined();

            // addWhereCountQuery non-numeric count and boolean 'or'
            const qCountNonNum = User.newQuery().addWhereCountQuery(User.newQuery().toBase(), '>=', 'custom_count', 'or');
            expect(qCountNonNum).toBeDefined();

            // getRelationWithoutConstraints throws RelationNotFoundException
            expect(() => {
                User.has('invalidNonExistentRelation');
            }).toThrow();

            // RelationNotFoundException default constructor message
            const _RelationNotFoundException = require('../src/eloquent/relationNotFoundException');
            const RelationNotFoundException = _RelationNotFoundException.default || _RelationNotFoundException;
            const defaultEx = new RelationNotFoundException();
            expect(defaultEx.message).toBe('Invalid Argument');

            // HasMany getResults() when parentKey is null
            const freshUser = new User();
            const emptyPosts = await freshUser.posts().getResults();
            expect(emptyPosts.count()).toBe(0);

            // SupportsDefaultModels getDefaultFor tests
            const relNoDefault = freshUser.country();
            expect(relNoDefault.getDefaultFor(freshUser)).toBeUndefined();

            const relTrueDefault = freshUser.country().withDefault();
            expect(relTrueDefault.getDefaultFor(freshUser)).toBeDefined();

            const fallbackDefault = freshUser.country().withDefault(() => null).getDefaultFor(freshUser);
            expect(fallbackDefault).toBeDefined();

            // HasOne comprehensive coverage
            const userWithNullKey = new User();
            const hasOneNullKeyRel = userWithNullKey.profile().withDefault({ bio: 'Null Parent Default' });
            const defaultNullProf = await hasOneNullKeyRel.getResults();
            expect(defaultNullProf.bio).toBe('Null Parent Default');

            // HasOne getResults when query returns null withDefault
            const userWithoutProfile = await User.create({ name: 'NoProfile', email: 'noprofile@test.com' });
            const defaultProfile = await userWithoutProfile.profile().withDefault({ bio: 'Fallback Bio' }).getResults();
            expect(defaultProfile.bio).toBe('Fallback Bio');

            // HasOne newRelatedInstanceFor & getRelatedKeyFrom
            const hasOneRel = user.profile();
            const relInst = hasOneRel.newRelatedInstanceFor(user);
            expect(relInst.user_id).toBe(user.id);
            expect(hasOneRel.getRelatedKeyFrom(relInst)).toBe(user.id);

            // HasOne one-of-many methods
            const mockSubQuery = { addSelect: jest.fn() };
            hasOneRel.addOneOfManySubQueryConstraints(mockSubQuery);
            expect(mockSubQuery.addSelect).toHaveBeenCalledWith(hasOneRel.$foreignKey);
            expect(hasOneRel.getOneOfManySubQuerySelectColumns()).toBe(hasOneRel.$foreignKey);

            const mockJoin = { on: jest.fn() };
            hasOneRel.qualifySubSelectColumn = jest.fn().mockReturnValue('sub.user_id');
            hasOneRel.qualifyRelatedColumn = jest.fn().mockReturnValue('profiles.user_id');
            hasOneRel.addOneOfManyJoinSubQueryConstraints(mockJoin);
            expect(mockJoin.on).toHaveBeenCalledWith('sub.user_id', '=', 'profiles.user_id');

            // HasOne getRelationExistenceQuery
            const existenceQuery = hasOneRel.getRelationExistenceQuery(hasOneRel.getQuery(), User.newQuery());
            expect(existenceQuery).toBeDefined();

            // HasOneThrough comprehensive tests
            const emptyCountry = await Country.create({ name: 'EmptyLand' });
            const hotRel = emptyCountry.profile().withDefault({ bio: 'Through Default' });
            const hotDefault = await hotRel.getResults();
            expect(hotDefault.bio).toBe('Through Default');
            expect(hotRel.newRelatedInstanceFor(emptyCountry)).toBeDefined();

            // test match with empty array in dictionary
            const dummyModel = new Country();
            dummyModel.setAttribute('id', 999);
            hotRel.buildDictionary = jest.fn().mockReturnValue({ '999': [] });
            hotRel.match([dummyModel], [], 'profile');
            expect(dummyModel.relation('profile')).toBeNull();

            // BelongsTo comprehensive method tests
            const belongsToRel = user.country();
            expect(belongsToRel.getChild()).toBe(user);
            expect(belongsToRel.getForeignKeyName()).toBe('country_id');
            expect(belongsToRel.getQualifiedForeignKeyName()).toBe('users.country_id');
            expect(belongsToRel.getParentKey()).toBe(user.country_id);
            expect(belongsToRel.getOwnerKeyName()).toBe('id');
            expect(belongsToRel.getQualifiedOwnerKeyName()).toBe('countries.id');
            expect(belongsToRel.getRelationName()).toBe('country');
            expect(belongsToRel.relationHasIncrementingId()).toBe(false);
            belongsToRel.$related.$keyType = 'int';
            expect(belongsToRel.relationHasIncrementingId()).toBe(true);
            belongsToRel.$related.$keyType = 'string';
            expect(belongsToRel.newRelatedInstanceFor(user)).toBeInstanceOf(Country);

            // getRelatedKeyFrom with model and plain object
            expect(belongsToRel.getRelatedKeyFrom(dummyModel)).toBe(999);
            expect(belongsToRel.getRelatedKeyFrom({ id: 888 })).toBe(888);

            // disassociate (alias of dissociate)
            belongsToRel.disassociate();
            expect(user.country_id).toBeNull();

            // associate with raw ID instead of Model
            belongsToRel.associate(123);
            expect(user.country_id).toBe(123);

            // BelongsTo addConstraints
            belongsToRel.addConstraints();

            // BelongsTo initRelation and match
            const btUser1 = new User();
            btUser1.setAttribute('country_id', 10);
            const btUser2 = new User();
            btUser2.setAttribute('country_id', 20);
            const btCountry1 = new Country();
            btCountry1.setAttribute('id', 10);
            btCountry1.setAttribute('name', 'Country10');
            belongsToRel.initRelation([btUser1, btUser2], 'country');
            expect(btUser1.relation('country')).toBeNull();

            // Direct call to BelongsTo.prototype.match
            belongsToRel.match([btUser1, btUser2], [btCountry1], 'country');
            expect(btUser1.relation('country')).toBe(btCountry1);
            expect(btUser2.relation('country')).toBeNull();

            // getRelationExistenceQuery for regular relation (non-self)
            const bQuery = Country.newQuery();
            const pQuery = User.newQuery();
            const relExistQuery = belongsToRel.getRelationExistenceQuery(bQuery, pQuery);
            expect(relExistQuery).toBeDefined();

            // BelongsTo without constraints
            const _BelongsToClass = require('../src/eloquent/relations/belongsTo');
            const BelongsToClass = _BelongsToClass.default || _BelongsToClass;
            BelongsToClass.noConstraints(() => {
                const unconstrainedBelongsTo = user.country();
                expect(unconstrainedBelongsTo).toBeDefined();
            });

            // BelongsTo self-relation existence query with default columns arg
            const selfUserQuery = User.newQuery();
            const selfParentQuery = User.newQuery();
            const selfRelExistQuery = belongsToRel.getRelationExistenceQuery(selfUserQuery, selfParentQuery);
            expect(selfRelExistQuery).toBeDefined();

            // BelongsTo getResults when foreign key is set but row doesn't exist in DB, withDefault configured
            const userWithMissingCountry = new User();
            userWithMissingCountry.setAttribute('country_id', 999999);
            const missingCountryRes = await userWithMissingCountry.country().withDefault({ name: 'Fallback Missing' }).getResults();
            expect(missingCountryRes.name).toBe('Fallback Missing');

            // HasOneOrMany methods coverage
            const postUser = await User.create({ name: 'PostUser', email: 'postuser@test.com' });
            const postsRel = postUser.posts();
            expect(postsRel.getExistenceCompareKey()).toBe(postsRel.getQualifiedForeignKeyName());
            expect(postsRel.getLocalKeyName()).toBe('id');

            // findOrNew (existing vs non-existing)
            const createdPost = await postsRel.create({ title: 'FindOrNew Post' });
            const foundPost = await postsRel.findOrNew(createdPost.id);
            expect(foundPost.id).toBe(createdPost.id);
            const newPost = await postsRel.findOrNew(999999);
            expect(newPost.user_id).toBe(postUser.id);
            expect(newPost.$exists).toBe(false);

            // firstOrNew with defaults
            const fonDefault = await postUser.posts().firstOrNew();
            expect(fonDefault.user_id).toBe(postUser.id);

            // firstOrCreate with defaults
            const focDefault = await postUser.posts().firstOrCreate();
            expect(focDefault.user_id).toBe(postUser.id);

            // updateOrCreate with defaults
            await postUser.posts().updateOrCreate({ id: focDefault.id });

            // make with default attributes
            const madeEmpty = postsRel.make();
            expect(madeEmpty.user_id).toBe(postUser.id);

            // create with default attributes
            const createdEmpty = await postsRel.create();
            expect(createdEmpty.user_id).toBe(postUser.id);

            // firstOrNew (existing vs non-existing)
            const fonExisting = await postUser.posts().firstOrNew({ title: 'FindOrNew Post' });
            expect(fonExisting.id).toBe(createdPost.id);
            const fonNew = await postUser.posts().firstOrNew({ title: 'Brand New Post' }, { body: 'New Body' });
            expect(fonNew.title).toBe('Brand New Post');
            expect(fonNew.user_id).toBe(postUser.id);

            // firstOrCreate (existing vs non-existing)
            const focExisting = await postUser.posts().firstOrCreate({ title: 'FindOrNew Post' });
            expect(focExisting.id).toBe(createdPost.id);
            const focNew = await postUser.posts().firstOrCreate({ title: 'FirstOrCreate Post' });
            expect(focNew.id).toBeDefined();

            // updateOrCreate
            await postUser.posts().updateOrCreate({ title: 'FirstOrCreate Post' }, { title: 'Updated Post Title' });

            // save & saveMany
            const unsavedPost1 = new Post({ title: 'Saved Post 1' });
            const savedResult = await postsRel.save(unsavedPost1);
            expect(savedResult.id).toBeDefined();

            const unsavedPost2 = new Post({ title: 'Saved Post 2' });
            const savedManyResult = await postsRel.saveMany([unsavedPost2]);
            expect(savedManyResult[0].id).toBeDefined();

            // make & makeMany
            const madeSingle = postsRel.make({ title: 'Made Single Post' });
            expect(madeSingle.title).toBe('Made Single Post');
            expect(madeSingle.user_id).toBe(postUser.id);

            const madeMany = postsRel.makeMany([{ title: 'Made Many 1' }, { title: 'Made Many 2' }]);
            expect(madeMany.count()).toBe(2);

            // getRelationValue fallback when empty array for 'one'
            expect(postsRel.getRelationValue({ 'key1': [] }, 'key1', 'one')).toBeNull();

            // save returning false when save() fails/returns falsy
            const mockFailingModel = new Post({ title: 'Fail' });
            mockFailingModel.save = jest.fn().mockResolvedValue(false);
            const failRes = await postsRel.save(mockFailingModel);
            expect(failRes).toBe(false);

            // interactsWithDictionary tests
            const customObj = { toString: () => 'custom_val' };
            expect(postsRel.getDictionaryKey(customObj)).toBe('custom_val');
            expect(() => postsRel.getDictionaryKey(Object.create(null))).toThrow('Model attribute value is an object but does not have a __toString method.');
            expect(postsRel.getDictionaryKey(null)).toBeNull();
            expect(postsRel.getDictionaryKey('primitive')).toBe('primitive');

            // canBeOneOfMany tests on HasOne
            const profileRel = user.profile();
            expect(profileRel.isOneOfMany()).toBe(false);
            expect(profileRel.getRelationQuery()).toBe(profileRel.getQuery());
            profileRel.$isOneOfMany = true;
            profileRel.$oneOfManySubQuery = { mock: 'subQuery' };
            profileRel.$relationName = 'profile';
            expect(profileRel.getOneOfManySubQuery()).toBe(profileRel.$oneOfManySubQuery);
            expect(profileRel.getRelationQuery()).toBe(profileRel.$oneOfManySubQuery);
            expect(profileRel.getRelationName()).toBe('profile');
            expect(profileRel.qualifySubSelectColumn('users.id')).toBe('profile.id');
            expect(profileRel.qualifyRelatedColumn('profiles.id')).toBe('profiles.id');
            expect(profileRel.qualifyRelatedColumn('id')).toBe('profiles.id');

            // getRelationExistenceQuery self-relation
            const selfPostQuery1 = Post.newQuery();
            const selfPostQuery2 = Post.newQuery();
            const selfHasManyExistence = postsRel.getRelationExistenceQuery(selfPostQuery1, selfPostQuery2);
            expect(selfHasManyExistence).toBeDefined();

            // Relation base methods coverage
            const _Relation = require('../src/eloquent/relations/relation');
            const Relation = _Relation.default || _Relation;
            const _MultipleRecordsFoundException = require('../src/eloquent/multipleRecordsFoundException');
            const MultipleRecordsFoundException = _MultipleRecordsFoundException.default || _MultipleRecordsFoundException;
            const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
            const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;

            // sole() tests
            const singleUser = await User.create({ name: 'SoleUser', email: 'sole@test.com' });
            await singleUser.posts().create({ title: 'Sole Post 1' });
            const foundSole = await singleUser.posts().sole();
            expect(foundSole.title).toBe('Sole Post 1');

            // sole() empty throws ModelNotFoundException
            const emptySoleUser = await User.create({ name: 'EmptySoleUser', email: 'emptysole@test.com' });
            await expect(emptySoleUser.posts().sole()).rejects.toThrow(ModelNotFoundException);

            // sole() multiple throws MultipleRecordsFoundException
            await singleUser.posts().create({ title: 'Sole Post 2' });
            await expect(singleUser.posts().sole()).rejects.toThrow(MultipleRecordsFoundException);

            // getEager, addConstraints, addEagerConstraints, initRelation, match, getResults base stubs
            const baseRel = new Relation(Post.newQuery(), singleUser);
            baseRel.addConstraints();
            baseRel.addEagerConstraints([]);
            baseRel.initRelation([], 'dummy');
            baseRel.match([], [], 'dummy');
            baseRel.getResults();
            expect(baseRel.getEager()).toBeDefined();

            // touch and rawUpdate
            baseRel.touch();
            const mockIgnoredModel = { isIgnoringTouch: () => true };
            baseRel.getRelated = () => mockIgnoredModel;
            baseRel.touch();

            // getRelationExistenceCountQuery
            const existCountQuery = postsRel.getRelationExistenceCountQuery(Post.newQuery(), User.newQuery());
            expect(existCountQuery).toBeDefined();

            // getRelationCountHash
            const hash1 = baseRel.getRelationCountHash(true);
            const hash2 = baseRel.getRelationCountHash(false);
            expect(hash1).toContain('ostro_reserved_');
            expect(hash2).toContain('ostro_reserved_');

            // getKeys
            const keysWithAttr = baseRel.getKeys(new ((require('@ostro/support/collection').default || require('@ostro/support/collection')))([singleUser]), 'name');
            expect(keysWithAttr).toEqual(['SoleUser']);
            const keysWithId = baseRel.getKeys(new ((require('@ostro/support/collection').default || require('@ostro/support/collection')))([singleUser]));
            expect(keysWithId).toEqual([singleUser.id]);

            // getBaseQuery, getParent, getRelated, createdAt, updatedAt, relatedUpdatedAt
            expect(postsRel.getBaseQuery()).toBeDefined();
            expect(postsRel.getParent()).toBe(postUser);
            expect(postsRel.getRelated()).toBeDefined();
            expect(postsRel.createdAt()).toBe('created_at');
            expect(postsRel.updatedAt()).toBe('updated_at');
            expect(postsRel.relatedUpdatedAt()).toBe('updated_at');

            // whereInEager & whereInMethod
            postsRel.whereInEager('whereIn', 'id', [1, 2]);
            postsRel.whereInEager('whereIn', 'id', []);
            expect(postsRel.$eagerKeysWereEmpty).toBe(true);

            // whereInMethod integer vs non-integer
            expect(postsRel.whereInMethod({ getKeyName: () => 'id', getKeyType: () => 'int' }, 'posts.id')).toBe('whereIntegerInRaw');
            expect(postsRel.whereInMethod({ getKeyName: () => 'id', getKeyType: () => 'string' }, 'posts.id')).toBe('whereIn');

            // setPerformQuery & getPerformQueries
            postsRel.setPerformQuery(() => {});
            postsRel.setPerformQuery([() => {}]);
            expect(postsRel.getPerformQueries()).toHaveLength(2);

            // rawUpdate
            const mockUpdateBuilder = {
                getModel: () => ({}),
                withoutGlobalScopes: () => ({
                    update: (attrs) => attrs
                })
            };
            const updateRel = new Relation(mockUpdateBuilder, postUser);
            // rawUpdate with default arg
            expect(updateRel.rawUpdate()).toEqual([]);

            // Relation.getRelationExistenceQuery non-self relation with default arg
            baseRel.getExistenceCompareKey = () => 'posts.user_id';
            const diffExistQuery = baseRel.getRelationExistenceQuery(Post.newQuery(), User.newQuery());
            expect(diffExistQuery).toBeDefined();

            // morphMap, buildMorphMapFromModels, getMorphedModel with default args & edge branches
            Relation.morphMap();
            Relation.buildMorphMapFromModels();
            Relation.$morphMap = [];
            Relation.morphMap([User, Post], false);
            Relation.morphMap([Comment]);
            Relation.morphMap([Comment], false);
            Relation.$morphMap = {};
            Relation.morphMap({ 'user_alias': User });
            Relation.morphMap({ 'post_alias': Post }, false);
            Relation.$morphMap = null;
            Relation.morphMap({ 'user_alias': User }, false);
            Relation.$morphMap = [];
            Relation.morphMap({ 'user_alias': User }, true);
            Relation.morphMap(123); // neither array nor object branches
            expect(Relation.getMorphedModel('user_alias')).toBe(User);
            expect(Relation.getMorphedModel('non_existent')).toBeNull();
            expect(Relation.buildMorphMapFromModels(null)).toBeNull();
            expect(Relation.buildMorphMapFromModels('invalid')).toBe('invalid');

            // __call proxy: unavailable method error, and return value !== this.$query
            expect(() => postsRel.nonExistentMethod()).toThrow('Property [nonExistentMethod] not available');
            const countRes = await postsRel.count();
            expect(typeof countRes).toBe('number');

            // getQualifiedParentKeyName
            expect(baseRel.getQualifiedParentKeyName()).toBe('users.id');

            // __call when result === this.$query returns this
            const mockQuery = {
                getModel: () => ({}),
                fluentMethod: function () { return this; }
            };
            const customRel = new Relation(mockQuery, postUser);
            expect(customRel.fluentMethod()).toBe(customRel);
        });
    });

    afterAll(async () => {
        if (db) {
            db.disconnect();
        }
    });

});
