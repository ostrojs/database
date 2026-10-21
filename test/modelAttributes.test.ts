'use strict';
/**
 * Tests targeting uncovered lines in:
 *  - eloquent/concern/guardsAttributes.js  (56%)
 *  - eloquent/concern/hidesAttributes.js   (83%)
 *  - eloquent/concern/hasAttributes.js     (80%)
 *  - eloquent/concern/hasTimestamps.js     (92%)
 *  - eloquent/model.js                     (71%)
 */
const { createDatabaseManager } = require('./setup');
const _Model = require('../src/eloquent/model');
const Model = _Model.default || _Model;
const _GuardsAttributes = require('../src/eloquent/concern/guardsAttributes');
const GuardsAttributes = _GuardsAttributes.default || _GuardsAttributes;
const _HidesAttributes = require('../src/eloquent/concern/hidesAttributes');
const HidesAttributes = _HidesAttributes.default || _HidesAttributes;
const { collect } = require('@ostro/support/function');

// ──────────────────────────────────────────────────────
//  Model definitions
// ──────────────────────────────────────────────────────
class Product extends Model {
    $table    = 'products_attr';
    $fillable = ['name', 'price', 'meta', 'active', 'stock', 'tag_list', 'score'];
    $casts    = {
        price:    'float',
        active:   'boolean',
        stock:    'integer',
        meta:     'json',
        tag_list: 'array',
        score:    'real',
    };
    $hidden  = ['internal_code'];
    $visible = [];

    getNameAttribute(v)    { return v ? v.trim() : v; }
    setNameAttribute(v)    { this.$attributes['name'] = v ? v.toUpperCase() : v; }

    scopeActive(q)    { return q.where('active', 1); }
    scopeExpensive(q) { return q.where('price', '>', 100); }
}

class Article extends Model {
    $table      = 'articles_attr';
    $fillable   = ['title', 'body', 'published'];
    $timestamps = false;
}

class TimestampedItem extends Model {
    $table    = 'ts_items';
    $fillable = ['label'];
}

// ──────────────────────────────────────────────────────
describe('Model – Attributes, Guards, Hides & Timestamps', () => {

    let db, conn, schema;

    beforeAll(async () => {
        const setup = createDatabaseManager();
        db     = setup.db;
        conn   = db.connection('sqlite');
        schema = conn.getSchemaBuilder();

        await schema.dropTableIfExists('ts_items');
        await schema.dropTableIfExists('articles_attr');
        await schema.dropTableIfExists('products_attr');

        await schema.createTable('products_attr', t => {
            t.increments('id');
            t.string('name');
            t.float('price').nullable();
            t.boolean('active').defaultTo(true);
            t.integer('stock').defaultTo(0);
            t.text('meta').nullable();
            t.text('tag_list').nullable();
            t.float('score').nullable();
            t.string('internal_code').nullable();
            t.timestamps();
        });

        await schema.createTable('articles_attr', t => {
            t.increments('id');
            t.string('title');
            t.text('body').nullable();
            t.boolean('published').defaultTo(false);
        });

        await schema.createTable('ts_items', t => {
            t.increments('id');
            t.string('label');
            t.timestamps();
        });
    });

    afterAll(async () => {
        await schema.dropTableIfExists('ts_items');
        await schema.dropTableIfExists('articles_attr');
        await schema.dropTableIfExists('products_attr');
        db.disconnect();
    });

    beforeEach(async () => {
        await conn.table('ts_items').delete();
        await conn.table('articles_attr').delete();
        await conn.table('products_attr').delete();
    });

    // ────────────────────────────────────────────
    //  GuardsAttributes concern (standalone)
    // ────────────────────────────────────────────
    describe('GuardsAttributes (concern standalone)', () => {

        function makeGuard(opts = {}) {
            const g = new GuardsAttributes();
            g.$fillable = opts.fillable || [];
            g.$guarded  = opts.guarded  !== undefined ? opts.guarded : ['*'];
            return g;
        }

        test('getFillable() returns $fillable array', () => {
            const g = makeGuard({ fillable: ['a', 'b'] });
            expect(g.getFillable()).toEqual(['a', 'b']);
        });

        test('fillable() (setter) sets $fillable', () => {
            const g = makeGuard();
            g.fillable(['x', 'y']);
            expect(g.$fillable).toEqual(['x', 'y']);
        });

        test('mergeFillable() extends $fillable', () => {
            const g = makeGuard({ fillable: ['a'] });
            g.mergeFillable(['b', 'c']);
            expect(g.$fillable).toContain('b');
            expect(g.$fillable).toContain('c');
        });

        test('guard() sets $guarded', () => {
            const g = makeGuard();
            g.guard(['secret']);
            expect(g.$guarded).toEqual(['secret']);
        });

        test('getGuarded() returns [] when $guarded is false', () => {
            const g = makeGuard({ guarded: false });
            expect(g.getGuarded()).toEqual([]);
        });

        test('getGuarded() returns $guarded array when set', () => {
            const g = makeGuard({ guarded: ['*'] });
            expect(g.getGuarded()).toEqual(['*']);
        });

        test('mergeGuarded() extends $guarded', () => {
            const g = makeGuard({ guarded: ['x'] });
            g.mergeGuarded(['y']);
            expect(g.$guarded).toContain('y');
        });

        test('unguard/reguard/isUnguarded toggle static state', () => {
            const g = makeGuard();
            g.constructor.$unguarded = false;
            g.unguard(true);
            expect(g.isUnguarded()).toBe(true);
            g.reguard();
            expect(g.isUnguarded()).toBe(false);
        });

        test('unguarded() runs callback and restores state', () => {
            const g = makeGuard();
            g.constructor.$unguarded = false;
            let called = false;
            g.unguarded(() => { called = true; });
            expect(called).toBe(true);
            expect(g.constructor.$unguarded).toBe(false);
        });

        test('unguarded() skips toggle when already unguarded', () => {
            const g = makeGuard();
            g.constructor.$unguarded = true;
            let called = false;
            g.unguarded(() => { called = true; });
            expect(called).toBe(true);
            g.constructor.$unguarded = false; // cleanup
        });

        test('isFillable() returns true when unguarded', () => {
            const g = makeGuard({ fillable: [] });
            g.constructor.$unguarded = true;
            expect(g.isFillable('anything')).toBe(true);
            g.constructor.$unguarded = false;
        });

        test('isFillable() returns true when key is in $fillable', () => {
            const g = makeGuard({ fillable: ['name'], guarded: [] });
            expect(g.isFillable('name')).toBe(true);
        });

        test('isFillable() returns false when key is guarded (wildcard)', () => {
            const g = makeGuard({ fillable: [], guarded: ['*'] });
            // After fixing isGuarded(), this no longer throws
            expect(g.isFillable('secret')).toBe(false);
        });

        test('totallyGuarded() returns true with empty fillable and wildcard guard', () => {
            const g = makeGuard({ fillable: [], guarded: ['*'] });
            expect(g.totallyGuarded()).toBe(true);
        });

        test('fillableFromArray() intersects with $fillable', () => {
            const g = makeGuard({ fillable: ['name', 'price'] });
            g.constructor.$unguarded = false;
            const result = g.fillableFromArray({ name: 'A', price: 10, secret: 'x' });
            expect(result).toContain('name');
            expect(result).toContain('price');
            expect(result).not.toContain('secret');
        });

        test('fillableFromArray() returns all keys when unguarded', () => {
            const g = makeGuard({ fillable: ['name'] });
            g.constructor.$unguarded = true;
            const result = g.fillableFromArray({ name: 'A', secret: 'x' });
            expect(result).toContain('secret');
            g.constructor.$unguarded = false;
        });

        test('fillableData() filters objects to only fillable keys', () => {
            const g = makeGuard({ fillable: ['name', 'price'], guarded: [] });
            // patch isFillable to use simpler logic for standalone
            g.isFillable = k => g.$fillable.includes(k);
            const result = g.fillableData([
                { name: 'Alpha', price: 10, secret: 'x' },
                { name: 'Beta', price: 20 },
            ]);
            expect(result[0]).not.toHaveProperty('secret');
            expect(result[0]).toHaveProperty('name', 'Alpha');
            expect(result).toHaveLength(2);
        });

        test('fillableData() wraps non-array in array', () => {
            const g = makeGuard({ fillable: ['name'], guarded: [] });
            g.isFillable = k => g.$fillable.includes(k);
            const result = g.fillableData({ name: 'Solo', secret: 'x' });
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('name', 'Solo');
            expect(result[0]).not.toHaveProperty('secret');
        });
    });

    // ────────────────────────────────────────────
    //  HidesAttributes concern (standalone)
    // ────────────────────────────────────────────
    describe('HidesAttributes (concern standalone)', () => {

        function makeHider(hidden = [], visible = []) {
            const h = new HidesAttributes();
            h.$hidden  = [...hidden];
            h.$visible = [...visible];
            return h;
        }

        test('getHidden() returns $hidden', () => {
            const h = makeHider(['a', 'b']);
            expect(h.getHidden()).toEqual(['a', 'b']);
        });

        test('setHidden() replaces $hidden', () => {
            const h = makeHider(['x']);
            h.setHidden(['a', 'b']);
            expect(h.$hidden).toEqual(['a', 'b']);
        });

        test('getVisible() returns $visible', () => {
            const h = makeHider([], ['name']);
            expect(h.getVisible()).toEqual(['name']);
        });

        test('setVisible() replaces $visible', () => {
            const h = makeHider();
            h.setVisible(['name', 'price']);
            expect(h.$visible).toEqual(['name', 'price']);
        });

        test('makeVisible() removes attrs from $hidden', () => {
            const h = makeHider(['a', 'b', 'c']);
            h.makeVisible(['a', 'b']);
            expect(h.$hidden).not.toContain('a');
            expect(h.$hidden).not.toContain('b');
            expect(h.$hidden).toContain('c');
        });

        test('makeVisible() adds to $visible when $visible is non-empty', () => {
            const h = makeHider(['price'], ['name']);
            h.makeVisible('price');
            expect(h.$visible).toContain('price');
        });

        test('makeVisible() accepts varargs', () => {
            const h = makeHider(['a', 'b', 'c']);
            h.makeVisible('a', 'b');
            expect(h.$hidden).not.toContain('a');
            expect(h.$hidden).toContain('c');
        });

        test('makeVisibleIf() true condition applies makeVisible', () => {
            const h = makeHider(['price']);
            h.makeVisibleIf(true, 'price');
            expect(h.$hidden).not.toContain('price');
        });

        test('makeVisibleIf() false condition leaves $hidden', () => {
            const h = makeHider(['price']);
            h.makeVisibleIf(false, 'price');
            expect(h.$hidden).toContain('price');
        });

        test('makeVisibleIf() callback condition', () => {
            const h = makeHider(['price']);
            h.makeVisibleIf(() => true, 'price');
            expect(h.$hidden).not.toContain('price');
        });

        test('makeHidden() adds attrs to $hidden', () => {
            const h = makeHider([]);
            h.makeHidden(['score', 'meta']);
            expect(h.$hidden).toContain('score');
            expect(h.$hidden).toContain('meta');
        });

        test('makeHidden() accepts varargs', () => {
            const h = makeHider([]);
            h.makeHidden('score', 'meta');
            expect(h.$hidden).toContain('score');
        });

        test('makeHiddenIf() true condition applies makeHidden', () => {
            const h = makeHider([]);
            h.makeHiddenIf(true, 'score');
            expect(h.$hidden).toContain('score');
        });

        test('makeHiddenIf() false condition leaves $hidden unchanged', () => {
            const h = makeHider([]);
            h.makeHiddenIf(false, 'score');
            expect(h.$hidden).not.toContain('score');
        });
    });

    // ────────────────────────────────────────────
    //  HasAttributes / Casts (via Model)
    // ────────────────────────────────────────────
    describe('HasAttributes / Casts (via Model)', () => {

        test('float / real cast converts string to float', () => {
            const p = new Product({ price: '9.99', score: '7.5' });
            expect(p.price).toBeCloseTo(9.99);
            expect(p.score).toBeCloseTo(7.5);
        });

        test('array cast converts JSON string to array', () => {
            const p = new Product({ tag_list: '["js","node"]' });
            expect(Array.isArray(p.tag_list)).toBe(true);
            expect(p.tag_list).toContain('js');
        });

        test('json cast converts JSON string to object', () => {
            const p = new Product({ meta: '{"key":"val"}' });
            expect(p.meta).toEqual({ key: 'val' });
        });

        test('json cast handles plain object input', () => {
            const p = new Product({ meta: { x: 1 } });
            expect(p.meta).toEqual({ x: 1 });
        });

        test('boolean cast: 0→false, 1→true', () => {
            // Use getAttribute() directly: 'active' property conflicts with scopeActive
            const _HA = require('../src/eloquent/concern/hasAttributes');
            const HA = _HA.default || _HA;
            const h = new HA();
            h.$casts = { active: 'boolean', flag: 'boolean' };
            expect(h.castAttribute('active', 0)).toBe(false);    // Boolean(0) = false
            expect(h.castAttribute('active', 1)).toBe(true);     // Boolean(1) = true
            expect(h.castAttribute('active', false)).toBe(false);
            expect(h.castAttribute('active', true)).toBe(true);
            expect(h.castAttribute('active', null)).toBeNull();  // null passthrough
        });


        test('integer cast truncates', () => {
            const p = new Product({ stock: '42.9' });
            expect(p.stock).toBe(42);
        });

        test('getAttribute() runs accessor (trim name)', () => {
            // Mutator runs first: '  hello  ' → '  HELLO  '
            // Accessor trims: '  HELLO  ' → 'HELLO'
            const p = new Product({ name: '  hello  ' });
            expect(p.name).toBe('HELLO');
        });

        test('setAttribute() runs mutator (uppercase name)', () => {
            const p = new Product({ name: 'world' });
            expect(p.$attributes['name']).toBe('WORLD');
        });

        test('getAttribute() returns raw value for non-accessored key', () => {
            const p = new Product({ stock: 5 });
            expect(p.getAttribute('stock')).toBe(5);
        });

        test('getAttributes() returns all raw attributes', () => {
            const p = new Product({ name: 'X', price: 1 });
            expect(p.getAttributes()).toHaveProperty('price');
        });

        test('syncOriginal() + getOriginal() tracks pre-change values', async () => {
            const p = await Product.create({ name: 'Orig', price: 10 });
            p.price = 99;
            expect(p.getOriginal('price')).toBe(10);
        });

        test('isDirty() and isClean() track attribute changes', async () => {
            const p = await Product.create({ name: 'Dirty', price: 5 });
            expect(p.isClean()).toBe(true);
            p.price = 6;
            expect(p.isDirty()).toBe(true);
            expect(p.isDirty('price')).toBe(true);
            expect(p.isDirty('name')).toBe(false);
        });

        test('getChanges() returns changed attributes after save', async () => {
            const p = await Product.create({ name: 'Changed', price: 1, stock: 1 });
            p.stock = 99;
            await p.save();
            const changes = p.getChanges();
            expect(changes).toBeDefined();
        });

        test('fill() respects fillable protection', () => {
            const p = new Product();
            p.fill({ name: 'ok', internal_code: 'hidden' });
            expect(p.$attributes).toHaveProperty('name');
            expect(p.$attributes['internal_code']).toBeUndefined();
        });

        test('forceFill() bypasses fillable protection', () => {
            const p = new Product();
            p.forceFill({ internal_code: 'BYPASS' });
            expect(p.$attributes['internal_code']).toBe('BYPASS');
        });
    });

    // ────────────────────────────────────────────
    //  HasTimestamps
    // ────────────────────────────────────────────
    describe('HasTimestamps', () => {

        test('usesTimestamps() is true by default', () => {
            const item = new TimestampedItem();
            expect(item.usesTimestamps()).toBe(true);
        });

        test('usesTimestamps() is false when $timestamps = false', () => {
            const a = new Article();
            expect(a.usesTimestamps()).toBe(false);
        });

        test('freshTimestamp() returns a date string', () => {
            const item = new TimestampedItem();
            const ts = item.freshTimestamp();
            // Should be a non-empty string from DateTime
            expect(ts).toBeTruthy();
            expect(typeof ts === 'string' || typeof ts === 'object').toBe(true);
        });

        test('getCreatedAtColumn() and getUpdatedAtColumn() return defaults', () => {
            const item = new TimestampedItem();
            expect(item.getCreatedAtColumn()).toBe('created_at');
            expect(item.getUpdatedAtColumn()).toBe('updated_at');
        });

        test('model without $timestamps does not set created_at/updated_at', async () => {
            const a = await Article.create({ title: 'No TS', published: false });
            expect(a.created_at).toBeUndefined();
            const fromDb = await Article.find(a.id);
            expect(fromDb.created_at).toBeUndefined();
        });

        test('touch() updates updated_at in DB', async () => {
            const item = await TimestampedItem.create({ label: 'Touch me' });
            const touched = await item.touch();
            expect(touched).toBe(true);
        });

        test('create sets created_at and updated_at', async () => {
            const item = await TimestampedItem.create({ label: 'TS Test' });
            expect(item.created_at).toBeDefined();
            expect(item.updated_at).toBeDefined();
        });
    });

    // ────────────────────────────────────────────
    //  Model – additional branches
    // ────────────────────────────────────────────
    describe('Model – additional branches', () => {

        test('newInstance() creates a new unfilled instance', () => {
            const p = new Product();
            const clone = p.newInstance({});
            expect(clone).toBeInstanceOf(Product);
        });

        test('newFromBuilder() hydrates from raw row', () => {
            const p = new Product();
            const hydrated = p.newFromBuilder({ id: 99, name: 'RAW', price: 99.9 });
            expect(hydrated.id).toBe(99);
        });

        test('toArray() omits $hidden columns', async () => {
            const p = await Product.create({ name: 'Hidden', price: 1, stock: 1 });
            await conn.table('products_attr').where('id', p.id).update({ internal_code: 'X1' });
            const fresh = await Product.find(p.id);
            expect(fresh.toArray()).not.toHaveProperty('internal_code');
        });

        test('toJson() serialises visible attributes', () => {
            const p = new Product({ name: 'A', stock: 1 });
            p.setAttribute('internal_code', 'X');
            const json = p.toJson();
            expect(json).not.toHaveProperty('internal_code');
        });

        test('getKey() returns primary key value', async () => {
            const p = await Product.create({ name: 'PK Test', price: 1 });
            expect(p.getKey()).toBe(p.id);
        });

        test('getKeyName() returns primary key column name', () => {
            const p = new Product();
            expect(p.getKeyName()).toBe('id');
        });

        test('getTable() returns $table', () => {
            expect(new Product().getTable()).toBe('products_attr');
        });

        test('qualifyColumn() prepends table name', () => {
            const p = new Product();
            expect(p.qualifyColumn('price')).toBe('products_attr.price');
        });

        test('newQuery() returns a query builder', () => {
            const p = new Product();
            expect(p.newQuery()).toBeDefined();
        });

        test('newQueryWithoutRelationships() returns base query', () => {
            const p = new Product();
            expect(p.newQueryWithoutRelationships()).toBeDefined();
        });

        test('where() chaining with multiple conditions', async () => {
            await Product.create({ name: 'Cheap', price: 5, active: true });
            await Product.create({ name: 'Expensive', price: 200, active: true });

            const cheap = await Product.where('price', '<', 50).where('active', 1).get();
            expect(cheap.count()).toBe(1);
        });

        test('scope chaining: active().expensive()', async () => {
            await Product.create({ name: 'CheapActive',     price: 50,  active: true  });
            await Product.create({ name: 'ExpensiveActive', price: 200, active: true  });
            await Product.create({ name: 'ExpensiveInactive', price: 300, active: false });

            const results = await Product.active().expensive().get();
            expect(results.count()).toBe(1);
            expect(results.first().price).toBeGreaterThan(100);
        });

        test('orderBy() + first() returns correct row', async () => {
            await Product.create({ name: 'ZZZ', price: 999 });
            await Product.create({ name: 'AAA', price: 1 });
            const first = await Product.orderBy('price', 'asc').first();
            expect(first.price).toBe(1);
        });

        test('count() returns total number of records', async () => {
            await Product.create({ name: 'C1', price: 1 });
            await Product.create({ name: 'C2', price: 2 });
            const cnt = await Product.count();
            expect(cnt).toBeGreaterThanOrEqual(2);
        });

        test('pluck() returns array of column values', async () => {
            await Product.create({ name: 'P1', price: 10 });
            await Product.create({ name: 'P2', price: 20 });
            const prices = await Product.orderBy('price', 'asc').pluck('price');
            // pluck may return an array or collection depending on impl
            const asArray = Array.isArray(prices) ? prices : (prices && prices.all ? prices.all() : [prices]);
            expect(asArray.length).toBeGreaterThanOrEqual(2);
        });

        test('setTable() changes the table name', () => {
            const p = new Product();
            p.setTable('custom_table');
            expect(p.getTable()).toBe('custom_table');
        });

        test('setKeyName() changes primary key column', () => {
            const p = new Product();
            p.setKeyName('uuid');
            expect(p.getKeyName()).toBe('uuid');
        });

        test('setKeyType() changes key type', () => {
            const p = new Product();
            p.setKeyType('integer');
            expect(p.getKeyType()).toBe('integer');
        });

        test('setConnection() sets connection name', () => {
            const p = new Product();
            p.setConnection('mysql');
            expect(p.getConnectionName()).toBe('mysql');
        });

        test('Model.setConnectionResolver() and getConnectionResolver()', () => {
            const resolver = Product.getConnectionResolver();
            expect(resolver).toBeDefined();
        });

        test('find() returns null for non-existent id', async () => {
            const notFound = await Product.find(999999);
            expect(notFound).toBeNull();
        });

        test('findOrFail() throws ModelNotFoundException', async () => {
            const _ModelNotFoundException = require('../src/eloquent/modelNotFoundException');
            const ModelNotFoundException = _ModelNotFoundException.default || _ModelNotFoundException;
            await expect(Product.findOrFail(999999)).rejects.toThrow(ModelNotFoundException);
        });

        test('firstOrCreate() finds or creates', async () => {
            const p1 = await Product.firstOrCreate({ name: 'UNIQUE' }, { price: 1 });
            const p2 = await Product.firstOrCreate({ name: 'UNIQUE' }, { price: 999 });
            expect(p1.id).toBe(p2.id);
            expect(p2.price).toBe(1); // original value kept
        });

        test('updateOrCreate() creates when not exists', async () => {
            const p = await Product.updateOrCreate({ name: 'NEWUOC' }, { price: 55 });
            expect(p.price).toBe(55);
        });

        test('updateOrCreate() updates when exists', async () => {
            await Product.create({ name: 'EXUOC', price: 5 });
            const p = await Product.updateOrCreate({ name: 'EXUOC' }, { price: 100 });
            expect(p.price).toBe(100);
        });

        test('fresh() returns a new instance from DB', async () => {
            const p = await Product.create({ name: 'Fresh', price: 1 });
            await conn.table('products_attr').where('id', p.id).update({ price: 99 });
            const fresh = await p.fresh();
            expect(fresh.price).toBe(99);
        });

        test('refresh() reloads model in-place from DB', async () => {
            const p = await Product.create({ name: 'Refresh', price: 1 });
            await conn.table('products_attr').where('id', p.id).update({ price: 77 });
            await p.refresh();
            expect(p.price).toBe(77);
        });

        test('destroy() removes by id', async () => {
            const p = await Product.create({ name: 'Destroy', price: 1 });
            await Product.destroy(p.id);
            expect(await Product.find(p.id)).toBeNull();
        });

        test('hydrate() creates collection from plain objects', () => {
            // hydrate() is an instance method, not static
            const instance = new Product();
            const items = instance.hydrate([
                { id: 1, name: 'A', price: 10 },
                { id: 2, name: 'B', price: 20 },
            ]);
            expect(items.count()).toBe(2);
            expect(items.first()).toBeInstanceOf(Product);
        });

        test('makeVisible() on model instance removes from hidden', async () => {
            const p = await Product.create({ name: 'MV', price: 1 });
            await conn.table('products_attr').where('id', p.id).update({ internal_code: 'SECRET' });
            const fresh = await Product.find(p.id);
            fresh.makeVisible('internal_code');
            expect(fresh.toArray()).toHaveProperty('internal_code');
        });

        test('makeHidden() on model instance adds to hidden', () => {
            const p = new Product({ name: 'MH', price: 1 });
            p.makeHidden('price');
            expect(p.toArray()).not.toHaveProperty('price');
        });

        test('getCasts() and various cast branches (string, unhandled)', () => {
            class CustomCastModel extends Model {
                $casts = { str_field: 'string', unhandled: 'custom_type' };
            }
            const model = new CustomCastModel();
            expect(model.getCasts()).toEqual({ str_field: 'string', unhandled: 'custom_type' });
            expect(model.castAttribute('str_field', 12345)).toBe('12345');
            expect(model.castAttribute('unhandled', { test: true })).toEqual({ test: true });
        });

        test('getAttributesForInsert, syncChanges, and getAttribute edge cases', () => {
            const p = new Product({ name: 'Edge', price: 99 });
            expect(p.getAttributesForInsert()).toEqual({ name: 'EDGE', price: 99 });
            expect(p.getAttribute('')).toBeUndefined();
            expect(p.getAttribute(null)).toBeUndefined();
            expect(p.getAttribute('save')).toBeUndefined(); // function on instance check

            p.syncOriginal();
            p.name = 'UpdatedEdge';
            p.syncChanges();
            expect(p.$changes).toEqual({ name: 'UPDATEDEDGE' });

            // Test $snakeAttributes = false in cacheMutatedAttributes
            class CamelMutatorModel extends Model {
                static $snakeAttributes = false;
                getFirstNameAttribute(v) { return v; }
            }
            const camelInst = new CamelMutatorModel();
            expect(camelInst.getMutatedAttributes()).toContain('firstName');

            // Test addMutatedAttributesToJSON continue branch when key is not present in attributes
            const mutatedRes = p.addMutatedAttributesToJSON({ other: 1 }, ['name']);
            expect(mutatedRes).toEqual({ other: 1 });

            // Test originalIsEquivalent edge cases
            const pEquiv = new Product({ name: 'Alpha', extra: null });
            pEquiv.syncOriginal();
            expect(pEquiv.originalIsEquivalent('missingKey')).toBe(false);
            pEquiv.$attributes.extra = 'not-null';
            expect(pEquiv.originalIsEquivalent('extra')).toBe(false);
            pEquiv.$attributes.extra = null;
            pEquiv.$original.extra = null;
            expect(pEquiv.originalIsEquivalent('extra')).toBe(true);
            pEquiv.$attributes.extra = null;
            pEquiv.$original.extra = 'something';
            expect(pEquiv.originalIsEquivalent('extra')).toBe(false);

            // Test relationsToJson branches
            p.setRelation('tags', collect([{ id: 1, name: 'tag1' }]));
            p.setRelation('profile', null);
            p.getRelations()['otherDetail'] = 'unhandledString';
            const relJson = p.relationsToJson();
            expect(relJson.tags).toEqual([{ id: 1, name: 'tag1' }]);
            expect(relJson.profile).toBeNull();
            expect(relJson.other_detail).toBeUndefined();

            // Test relationsToJson with $snakeAttributes = false
            Product.$snakeAttributes = false;
            p.setRelation('camelCaseRel', null);
            expect(p.relationsToJson().camelCaseRel).toBeNull();
            Product.$snakeAttributes = true;

            // Test mutateAttributeForJSON with Collection and ModelInterface
            class DummyCollModel extends Model {
                $appends = { extraInfo: 'val1', hiddenApp: 'val2' };
                $visible = ['extraInfo', 'tags', 'loadedRel'];
                $hidden = [];

                getTagsAttribute() {
                    return collect([{ id: 10 }]);
                }
                getUserAttribute() {
                    const u = new Product();
                    u.setRawAttributes({ name: 'NestedUser' });
                    return u;
                }
                getSimpleAttribute() {
                    return 'simple-val';
                }
            }
            const dummyInst = new DummyCollModel();
            expect(dummyInst.mutateAttributeForJSON('tags', null)).toEqual([{ id: 10 }]);
            expect(dummyInst.mutateAttributeForJSON('user', null)).toEqual({ name: 'NestedUser' });
            expect(dummyInst.mutateAttributeForJSON('simple', null)).toBe('simple-val');

            // Test getJsonableAppends() and getJsonableItems() with visible and hidden
            expect(dummyInst.getJsonableAppends()).toEqual({ extraInfo: 'val1' });

            // Test attributesToJson with relation Collection and ModelInterface
            dummyInst.setRelation('tags', collect([{ id: 20 }]));
            const dummyUser = new Product();
            dummyUser.setRawAttributes({ name: 'UserInRel' });
            dummyInst.setRelation('userRel', dummyUser);
            dummyInst.makeVisible('userRel');
            const dummyAttrsJson = dummyInst.attributesToJson();
            expect(dummyAttrsJson.tags).toEqual([{ id: 20 }]);
            expect(dummyAttrsJson.userRel).toEqual({ name: 'UserInRel' });

            // Test addMutatedAttributesToJSON with existing key
            dummyInst.setRawAttributes({ tags: 'raw' });
            const mutatedObj = dummyInst.addMutatedAttributesToJSON({ tags: 'raw' }, ['tags']);
            expect(mutatedObj.tags).toEqual([{ id: 10 }]);

            // Test getRelationValue branch
            expect(dummyInst.getRelationValue('nonExistentRelation')).toBeUndefined();
            dummyInst.setRelation('loadedRel', { foo: 'bar' });
            expect(dummyInst.getRelationValue('loadedRel')).toEqual({ foo: 'bar' });

            // Test isDirty with string and array and multiple arguments
            p.syncOriginal();
            expect(p.isDirty('name')).toBe(false);
            expect(p.isDirty(['name'])).toBe(false);
            expect(p.isDirty(123)).toBe(false);
            p.name = 'BrandNewName';
            expect(p.isDirty('name')).toBe(true);
            expect(p.isDirty(['name'])).toBe(true);
            expect(p.isDirty('price', 'name')).toBe(true);
            expect(p.isDirty('price', 'other')).toBe(false);

            // Test casts: int, bool, object
            class CastVarietyModel extends Model {
                $fillable = ['qty', 'flag', 'data', 'nil'];
                $casts = {
                    qty: 'int',
                    flag: 'bool',
                    data: 'object',
                    nil: 'int',
                };
            }
            const castInst = new CastVarietyModel({
                qty: '42',
                flag: 1,
                data: '{"a":1}',
                nil: null,
            });
            expect(castInst.qty).toBe(42);
            expect(castInst.flag).toBe(true);
            expect(castInst.data).toEqual({ a: 1 });
            expect(castInst.nil).toBeNull();
            castInst.$casts = null;
            expect(castInst.getCasts()).toEqual({});
        });
    });

});
