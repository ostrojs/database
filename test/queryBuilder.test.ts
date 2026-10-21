const { createDatabaseManager } = require('./setup');

describe('Query Builder Comprehensive Unit Tests', () => {

    let db;
    let conn;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db = setup.db;
        conn = db.connection('sqlite');

        const schema = conn.getSchemaBuilder();
        await schema.dropTableIfExists('orders');
        await schema.dropTableIfExists('users');

        await schema.createTable('users', (table) => {
            table.increments('id');
            table.string('name');
            table.string('email').unique();
            table.integer('age').nullable();
            table.string('role').defaultTo('user');
            table.boolean('active').defaultTo(true);
            table.timestamps();
        });

        await schema.createTable('orders', (table) => {
            table.increments('id');
            table.integer('user_id').unsigned();
            table.decimal('amount', 8, 2);
            table.string('status').defaultTo('pending');
            table.timestamps();
        });
    });

    afterAll(async () => {
        const schema = conn.getSchemaBuilder();
        await schema.dropTableIfExists('orders');
        await schema.dropTableIfExists('users');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('orders').delete();
        await conn.table('users').delete();
    });

    describe('Inserts & CRUD operations', () => {
        test('insert() adds single and multiple rows into table', async () => {
            const [id] = await conn.table('users').insert({
                name: 'Alice',
                email: 'alice@example.com',
                age: 28,
                role: 'admin'
            });
            expect(id).toBe(1);

            await conn.table('users').insert([
                { name: 'Bob', email: 'bob@example.com', age: 34, role: 'user' },
                { name: 'Charlie', email: 'charlie@example.com', age: 22, role: 'user' }
            ]);

            const count = await conn.table('users').count('* as total');
            expect(Number(count)).toBe(3);
        });

        test('update() updates records matching conditions', async () => {
            await conn.table('users').insert({
                name: 'Emma',
                email: 'emma@example.com',
                age: 30,
                role: 'user'
            });

            const affected = await conn.table('users')
                .where('email', 'emma@example.com')
                .update({ role: 'manager', age: 31 });

            expect(affected).toBe(1);

            const user = await conn.table('users').where('email', 'emma@example.com').first();
            expect(user.role).toBe('manager');
            expect(user.age).toBe(31);
        });

        test('updateOrInsert() updates existing or inserts new record', async () => {
            await conn.table('users').updateOrInsert(
                { email: 'upsert@example.com' },
                { name: 'Upsert Insert', age: 25 }
            );

            let user = await conn.table('users').where('email', 'upsert@example.com').first();
            expect(user.name).toBe('Upsert Insert');

            await conn.table('users').updateOrInsert(
                { email: 'upsert@example.com' },
                { name: 'Upsert Update', age: 26 }
            );

            user = await conn.table('users').where('email', 'upsert@example.com').first();
            expect(user.name).toBe('Upsert Update');
            expect(user.age).toBe(26);
        });

        test('increment() and decrement() modify column values', async () => {
            await conn.table('users').insert({
                name: 'Frank',
                email: 'frank@example.com',
                age: 50
            });

            await conn.table('users').where('email', 'frank@example.com').increment('age', 5);
            let user = await conn.table('users').where('email', 'frank@example.com').first();
            expect(user.age).toBe(55);

            await conn.table('users').where('email', 'frank@example.com').decrement('age', 2);
            user = await conn.table('users').where('email', 'frank@example.com').first();
            expect(user.age).toBe(53);
        });

        test('delete() removes records matching conditions', async () => {
            await conn.table('users').insert([
                { name: 'User1', email: 'u1@example.com', age: 20 },
                { name: 'User2', email: 'u2@example.com', age: 25 }
            ]);

            const deleted = await conn.table('users').where('age', '<', 22).delete();
            expect(deleted).toBe(1);

            const remaining = await conn.table('users').count('* as total');
            expect(Number(remaining)).toBe(1);
        });

        test('truncate() empties table records', async () => {
            await conn.table('users').insert([
                { name: 'U1', email: 'u1@example.com' },
                { name: 'U2', email: 'u2@example.com' }
            ]);

            await conn.table('users').truncate();
            const count = await conn.table('users').count('* as total');
            expect(Number(count)).toBe(0);
        });
    });

    describe('Where Clauses & Filters', () => {
        beforeEach(async () => {
            await conn.table('users').insert([
                { name: 'John Doe', email: 'john@example.com', age: 25, role: 'admin', active: true },
                { name: 'Jane Doe', email: 'jane@example.com', age: 30, role: 'editor', active: true },
                { name: 'Sam Smith', email: 'sam@example.com', age: 35, role: 'user', active: false },
                { name: 'No Age', email: 'noage@example.com', age: null, role: 'user', active: true }
            ]);
        });

        test('where() and orWhere() filter records', async () => {
            const admins = await conn.table('users').where('role', 'admin').get();
            expect(admins).toHaveLength(1);
            expect(admins[0].name).toBe('John Doe');

            const filtered = await conn.table('users')
                .where('role', 'admin')
                .orWhere('role', 'editor')
                .get();
            expect(filtered).toHaveLength(2);
        });

        test('whereIn() and whereNotIn() filter against list of values', async () => {
            const inList = await conn.table('users').whereIn('age', [25, 35]).get();
            expect(inList).toHaveLength(2);

            const notInList = await conn.table('users').whereNotIn('role', ['admin', 'editor']).get();
            expect(notInList).toHaveLength(2);
        });

        test('whereNull() and whereNotNull() filter nullable columns', async () => {
            const nullAges = await conn.table('users').whereNull('age').get();
            expect(nullAges).toHaveLength(1);
            expect(nullAges[0].email).toBe('noage@example.com');

            const notNullAges = await conn.table('users').whereNotNull('age').get();
            expect(notNullAges).toHaveLength(3);
        });

        test('whereBetween() and whereNotBetween() check ranges', async () => {
            const between = await conn.table('users').whereBetween('age', [24, 31]).get();
            expect(between).toHaveLength(2);

            const notBetween = await conn.table('users').whereNotBetween('age', [24, 31]).whereNotNull('age').get();
            expect(notBetween).toHaveLength(1);
            expect(notBetween[0].age).toBe(35);
        });

        test('whereRaw() allows raw expressions', async () => {
            const rawResults = await conn.table('users').whereRaw('age > ? and active = ?', [20, 1]).get();
            expect(rawResults).toHaveLength(2);
        });

        test('exists() and doesntExist() check for record existence', async () => {
            const hasAdmin = await conn.table('users').where('role', 'admin').exists();
            expect(hasAdmin).toBe(true);

            const hasSuperAdmin = await conn.table('users').where('role', 'superadmin').doesntExist();
            expect(hasSuperAdmin).toBe(true);
        });
    });

    describe('Ordering, Grouping, Limiting & Pagination', () => {
        beforeEach(async () => {
            await conn.table('users').insert([
                { name: 'User A', email: 'a@example.com', age: 20, role: 'user' },
                { name: 'User B', email: 'b@example.com', age: 30, role: 'user' },
                { name: 'User C', email: 'c@example.com', age: 40, role: 'admin' },
                { name: 'User D', email: 'd@example.com', age: 50, role: 'admin' },
                { name: 'User E', email: 'e@example.com', age: 60, role: 'user' }
            ]);
        });

        test('orderBy(), latest(), oldest() order rows', async () => {
            const desc = await conn.table('users').orderBy('age', 'desc').get();
            expect(desc[0].name).toBe('User E');
            expect(desc[desc.length - 1].name).toBe('User A');

            const oldest = await conn.table('users').oldest('age').first();
            expect(oldest.name).toBe('User A');

            const latest = await conn.table('users').latest('age').first();
            expect(latest.name).toBe('User E');
        });

        test('limit(), offset(), take(), skip() constrain result counts', async () => {
            const page1 = await conn.table('users').orderBy('age', 'asc').take(2).get();
            expect(page1).toHaveLength(2);
            expect(page1[0].name).toBe('User A');

            const page2 = await conn.table('users').orderBy('age', 'asc').skip(2).take(2).get();
            expect(page2).toHaveLength(2);
            expect(page2[0].name).toBe('User C');
        });

        test('pluck() and value() retrieve single columns or fields', async () => {
            const ages = await conn.table('users').orderBy('age', 'asc').pluck('age');
            expect(ages).toEqual([20, 30, 40, 50, 60]);

            const email = await conn.table('users').where('name', 'User C').value('email');
            expect(email).toBe('c@example.com');
        });

        test('collection() wraps results into Ostro Collection instance', async () => {
            const col = await conn.table('users').orderBy('age', 'asc').collection();
            expect(col.count()).toBe(5);
            expect(col.first().name).toBe('User A');
            expect(col.last().name).toBe('User E');
        });

        test('aggregates: count, min, max, sum, avg calculate values', async () => {
            const count = await conn.table('users').count('* as total');
            expect(Number(count)).toBe(5);

            const minAge = await conn.table('users').min('age as min_age');
            expect(minAge[0].min_age).toBe(20);

            const maxAge = await conn.table('users').max('age as max_age');
            expect(maxAge[0].max_age).toBe(60);

            const sumAge = await conn.table('users').sum('age as sum_age');
            expect(sumAge[0].sum_age).toBe(200);

            const avgAge = await conn.table('users').avg('age as avg_age');
            expect(avgAge[0].avg_age).toBe(40);
        });

        test('paginate() and simplePaginate() return Paginators with metadata', async () => {
            const paginated = await conn.table('users').orderBy('id', 'asc').paginate(2, 'page', 1);
            expect(paginated).toBeDefined();
            expect(paginated.total()).toBe(5);
            expect(paginated.perPage()).toBe(2);
            expect(paginated.currentPage()).toBe(1);
            expect(paginated.items()).toHaveLength(2);

            const simple = await conn.table('users').orderBy('id', 'asc').simplePaginate(2, 1);
            expect(simple).toBeDefined();
            expect(simple.perPage()).toBe(2);
            expect(simple.currentPage()).toBe(1);
        });
    });

    describe('Joins', () => {
        beforeEach(async () => {
            const [uId] = await conn.table('users').insert({ name: 'Buyer', email: 'buyer@example.com' });
            await conn.table('orders').insert([
                { user_id: uId, amount: 99.99, status: 'completed' },
                { user_id: uId, amount: 49.50, status: 'pending' }
            ]);
        });

        test('join() and leftJoin() combine results across tables', async () => {
            const joined = await conn.table('users')
                .join('orders', 'users.id', '=', 'orders.user_id')
                .select('users.name', 'orders.amount', 'orders.status')
                .get();

            expect(joined).toHaveLength(2);
            expect(joined[0].name).toBe('Buyer');
            expect(joined[0].amount).toBe(99.99);

            const leftJoined = await conn.table('users')
                .leftJoin('orders', 'users.id', '=', 'orders.user_id')
                .select('users.email', 'orders.amount')
                .get();

            expect(leftJoined).toHaveLength(2);
        });
    });

    describe('Processors', () => {
        test('Processor default methods pass through results properly', () => {
            const _Processor = require('../src/query/processors/processor');
            const Processor = _Processor.default || _Processor;
            const proc = new Processor();
            const dummy = [{ a: 1 }];

            expect(proc.processSelect(null, dummy)).toBe(dummy);
            expect(proc.processInsertGetId(null, 'sql', {}, 'seq')).toBe('seq');
            expect(proc.processTables(dummy)).toBe(dummy);
            expect(proc.processViews(dummy)).toBe(dummy);
            expect(proc.processTypes(dummy)).toBe(dummy);
            expect(proc.processColumns(dummy)).toBe(dummy);
            expect(proc.processIndexes(dummy)).toBe(dummy);
            expect(proc.processForeignKeys(dummy)).toBe(dummy);
            expect(proc.processColumnListing(dummy)).toBe(dummy);
        });
    });

});
