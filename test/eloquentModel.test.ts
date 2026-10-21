const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;

class User extends Model {
    $table = 'users';
    $fillable = ['name', 'email', 'age', 'is_admin', 'active', 'settings', 'role'];
    $casts = {
        'age': 'integer',
        'is_admin': 'boolean',
        'settings': 'json'
    };
    $hidden = ['password'];

    // Accessor
    getNameAttribute(value) {
        return value ? value.toUpperCase() : value;
    }

    // Mutator
    setEmailAttribute(value) {
        this.$attributes['email'] = value ? value.toLowerCase() : value;
    }

    // Local Scope
    scopeActive(query) {
        return query.where('active', 1);
    }

    scopeAdmins(query) {
        return query.where('role', 'admin');
    }
}

describe('Eloquent Model Comprehensive Unit Tests', () => {

    let db;
    let conn;
    let schema;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');
        schema = conn.getSchemaBuilder();

        await schema.dropTableIfExists('users');
        await schema.createTable('users', (table) => {
            table.increments('id');
            table.string('name');
            table.string('email').unique();
            table.string('password').nullable();
            table.integer('age').nullable();
            table.boolean('is_admin').defaultTo(false);
            table.boolean('active').defaultTo(true);
            table.string('role').defaultTo('user');
            table.text('settings').nullable();
            table.timestamps();
        });
    });

    afterAll(async () => {
        await schema.dropTableIfExists('users');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('users').delete();
    });

    describe('Attributes, Mass Assignment & Casting', () => {
        test('instantiation fills attributes adhering to $fillable', () => {
            const user = new User({
                name: 'Alice',
                email: 'ALICE@EXAMPLE.COM',
                age: '25',
                is_admin: 1,
                settings: { theme: 'dark' },
                guarded_col: 'hack'
            });

            expect(user.name).toBe('ALICE'); // accessor transforms to uppercase
            expect(user.email).toBe('alice@example.com'); // mutator transforms to lowercase
            expect(user.age).toBe(25); // integer cast
            expect(user.is_admin).toBe(true); // boolean cast
            expect(user.settings).toEqual({ theme: 'dark' }); // json cast
            expect(user.guarded_col).toBeUndefined(); // mass assignment protection
        });

        test('forceFill() bypasses fillable restrictions', () => {
            const user = new User();
            user.forceFill({
                name: 'Bob',
                custom_unfillable: 'allowed'
            });

            expect(user.custom_unfillable).toBe('allowed');
        });

        test('isDirty(), isClean(), getOriginal() and syncOriginal() track changes', () => {
            const user = new User({ name: 'Charlie', age: 30 });
            user.syncOriginal();

            expect(user.isClean()).toBe(true);
            expect(user.isDirty()).toBe(false);

            user.age = 35;
            expect(user.isDirty()).toBe(true);
            expect(user.isDirty('age')).toBe(true);
            expect(user.isDirty('name')).toBe(false);
            expect(user.getOriginal('age')).toBe(30);
        });

        test('toArray() and toJson() respects $hidden attributes', () => {
            const user = new User({
                name: 'Dave',
                email: 'dave@example.com',
                password: 'supersecretpassword'
            });

            const arrayData = user.toArray();
            expect(arrayData.password).toBeUndefined();
            expect(arrayData.email).toBe('dave@example.com');

            const jsonObject = user.toJson();
            expect(jsonObject.password).toBeUndefined();
            expect(jsonObject.email).toBe('dave@example.com');
        });

        test('makeVisible(), makeHidden(), makeVisibleIf(), makeHiddenIf() dynamically alter visible attributes', () => {
            const user = new User({
                name: 'Visible Dave',
                email: 'dave@example.com'
            });
            user.setAttribute('password', 'secret');

            expect(user.getHidden()).toContain('password');
            user.makeVisible('password');
            expect(user.getHidden()).not.toContain('password');
            expect(user.toJson().password).toBe('secret');

            user.makeHidden(['password', 'email']);
            expect(user.getHidden()).toEqual(expect.arrayContaining(['password', 'email']));
            expect(user.toJson().email).toBeUndefined();

            user.makeVisibleIf(true, 'email');
            expect(user.toJson().email).toBe('dave@example.com');

            user.makeHiddenIf(true, 'name');
            expect(user.toJson().name).toBeUndefined();

            user.makeHiddenIf(false, 'email');
            expect(user.toJson().email).toBe('dave@example.com');
        });

        test('Eloquent Collection toArray(), toJson(), and serialize()', () => {
            const user1 = new User({ name: 'User 1', email: 'u1@test.com' });
            const user2 = new User({ name: 'User 2', email: 'u2@test.com' });
            const _Collection = require('../src/eloquent/collection');
            const Collection = _Collection.default || _Collection;
            const col = new Collection([user1, user2]);

            const arr = col.toArray();
            expect(arr).toHaveLength(2);
            expect(arr[0].name).toBe('USER 1');

            const json = col.toJson();
            expect(json).toHaveLength(2);
            expect(json[0].name).toBe('USER 1');

            const serialized = col.serialize();
            expect(Array.isArray(serialized)).toBe(true);
        });

        test('unguard() and reguard() manage global unguarded state', () => {
            expect(User.$unguarded).toBe(false);
            User.unguard();
            expect(User.$unguarded).toBe(true);

            const user = new User({
                name: 'Unguarded User',
                guarded_col: 'allowed_now'
            });
            expect(user.guarded_col).toBe('allowed_now');

            User.reguard();
            expect(User.$unguarded).toBe(false);
        });
    });

    describe('Model Persistence & CRUD', () => {
        test('create() persists model to database and sets timestamps and auto-id', async () => {
            const user = await User.create({
                name: 'Eve',
                email: 'eve@example.com',
                age: 28,
                is_admin: true
            });

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBeDefined();
            expect(user.created_at).toBeDefined();
            expect(user.updated_at).toBeDefined();

            const fromDb = await User.find(user.id);
            expect(fromDb).not.toBeNull();
            expect(fromDb.email).toBe('eve@example.com');
        });

        test('save() updates existing record', async () => {
            const user = await User.create({
                name: 'Frank',
                email: 'frank@example.com',
                age: 40
            });

            user.age = 41;
            const saved = await user.save();
            expect(saved).toBe(true);

            const refreshed = await User.find(user.id);
            expect(refreshed.age).toBe(41);
        });

        test('update() modifies attributes and saves in one operation', async () => {
            const user = await User.create({
                name: 'Grace',
                email: 'grace@example.com',
                age: 22
            });

            await user.update({ age: 23, role: 'editor' });

            const fetched = await User.find(user.id);
            expect(fetched.age).toBe(23);
            expect(fetched.role).toBe('editor');
        });

        test('delete() and destroy() remove models', async () => {
            const u1 = await User.create({ name: 'U1', email: 'u1@example.com' });
            const u2 = await User.create({ name: 'U2', email: 'u2@example.com' });

            await u1.delete();
            expect(await User.find(u1.id)).toBeNull();

            await User.destroy(u2.id);
            expect(await User.find(u2.id)).toBeNull();
        });

        test('find(), findOrFail(), first(), firstOrFail() lookup behaviors', async () => {
            const created = await User.create({ name: 'Helen', email: 'helen@example.com' });

            const found = await User.find(created.id);
            expect(found.id).toBe(created.id);

            const foundFail = await User.findOrFail(created.id);
            expect(foundFail.id).toBe(created.id);

            await expect(User.findOrFail(99999)).rejects.toThrow(ModelNotFoundException);

            const firstUser = await User.where('email', 'helen@example.com').first();
            expect(firstUser.name).toBe('HELEN');

            await expect(User.where('email', 'ghost@example.com').firstOrFail()).rejects.toThrow(ModelNotFoundException);
        });

        test('firstOrCreate() and updateOrCreate() find or create instances', async () => {
            const user1 = await User.firstOrCreate(
                { email: 'unique@example.com' },
                { name: 'Created User', age: 33 }
            );
            expect(user1.name).toBe('CREATED USER');

            // Second call retrieves existing user without creating duplicate
            const user2 = await User.firstOrCreate(
                { email: 'unique@example.com' },
                { name: 'Duplicate Should Not Run', age: 99 }
            );
            expect(user2.id).toBe(user1.id);
            expect(user2.age).toBe(33);

            // updateOrCreate
            const updated = await User.updateOrCreate(
                { email: 'unique@example.com' },
                { age: 34 }
            );
            expect(updated.id).toBe(user1.id);
            expect(updated.age).toBe(34);
        });

        test('fresh() and refresh() re-retrieve current state from database', async () => {
            const user = await User.create({ name: 'Ian', email: 'ian@example.com', age: 50 });

            await conn.table('users').where('id', user.id).update({ age: 51 });

            const freshUser = await user.fresh();
            expect(freshUser.age).toBe(51);

            await user.refresh();
            expect(user.age).toBe(51);
        });
    });

    describe('Local Scopes', () => {
        beforeEach(async () => {
            await User.create({ name: 'Active Admin', email: 'admin1@example.com', role: 'admin', active: true });
            await User.create({ name: 'Active User', email: 'user1@example.com', role: 'user', active: true });
            await User.create({ name: 'Inactive Admin', email: 'admin2@example.com', role: 'admin', active: false });
        });

        test('local scopes filter query builder instances', async () => {
            const admins = await User.admins().get();
            expect(admins.all()).toHaveLength(2);

            const activeAdmins = await User.active().admins().get();
            expect(activeAdmins.all()).toHaveLength(1);
            expect(activeAdmins.first().email).toBe('admin1@example.com');
        });

        test('touch() and usesTimestamps() behavior', async () => {
            const user = await User.create({ name: 'Touch User', email: 'touch@example.com' });
            expect(user.usesTimestamps()).toBe(true);
            const originalUpdated = user.updated_at;

            // Wait a moment and touch
            const touched = await user.touch();
            expect(touched).toBe(true);
            expect(user.updated_at).toBeDefined();
        });

        test('RelationNotFoundException and ModelNotFoundException methods and properties', () => {
            const _RelationNotFoundException = require('../src/eloquent/relationNotFoundException');
            const RelationNotFoundException = _RelationNotFoundException.default || _RelationNotFoundException;
            const err = RelationNotFoundException.make(new User(), 'invalidRelation');
            expect(err.message).toContain('invalidRelation');
            expect(err.$relation).toBe('invalidRelation');
            expect(err.statusCode).toBe(500);

            const modelErr = (new ModelNotFoundException()).setModel(User, [123]);
            expect(modelErr.statusCode).toBe(500);
            expect(modelErr.getIds()).toEqual([123]);
            expect(modelErr.message).toContain('User');
            expect(modelErr.message).toContain('123');
        });

        test('throws MethodNotAvailable on unknown method call', () => {
            const user = new User();
            expect(() => {
                user.totallyNonExistentMethod();
            }).toThrow();

            expect(() => {
                User.totallyNonExistentStaticMethod();
            }).toThrow();
        });
    });

});
