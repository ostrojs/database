import Model from '../model';

/**
 * Class Pivot.
 */
class Pivot {

    public $foreignKey: any;

    public $relatedKey: any;

    public $attributes: Record<string, any>;

    public $table: any;

    public $exists: boolean = false;

    [key: string | symbol]: any;

    /**
     * Create a new instance.
     * @param {*} attributes
     */
    constructor(attributes: Record<string, any> = {}) {
        this.$foreignKey = null;
        this.$relatedKey = null;
        this.$attributes = {};
        this.$table = null;
        this.setRawAttributes(attributes);
        return new Proxy(this, {
            /**
             * get method.
             * @param {*} target
             * @param {*} prop
             * @param {*} receiver
             * @returns {any}
             */
            get(target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                return target.$attributes ? target.$attributes[prop as any] : undefined;
            },
            /**
             * set method.
             * @param {*} target
             * @param {*} prop
             * @param {*} value
             * @param {*} receiver
             * @returns {any}
             */
            set(target, prop, value, receiver) {
                if (prop in target || typeof prop === 'symbol') {
                    return Reflect.set(target, prop, value, receiver);
                }
                target.$attributes = target.$attributes || {};
                target.$attributes[prop] = value;
                return true;
            }
        });
    }

    /**
     * setTable method.
     * @param {*} table
     * @returns {any}
     */
    public setTable(table: string) {
        this.$table = table;
        return this;
    }

    /**
     * getTable method.
     * @returns {any}
     */
    public getTable() {
        return this.$table;
    }

    /**
     * setRawAttributes method.
     * @param {*} attributes
     * @param {*} exists
     * @returns {any}
     */
    public setRawAttributes(attributes: Record<string, any>, exists: boolean = false) {
        this.$attributes = Object.assign({}, attributes);
        this.$exists = exists;
        return this;
    }

    /**
     * getAttributes method.
     * @returns {any}
     */
    public getAttributes() {
        return this.$attributes;
    }

    /**
     * fill method.
     * @param {*} attributes
     * @returns {any}
     */
    public fill(attributes: Record<string, any>) {
        Object.assign(this.$attributes, attributes);
        return this;
    }

    /**
     * isDirty method.
     * @returns {any}
     */
    public isDirty() {
        return true;
    }

    /**
     * save method.
     * @async
     * @returns {any}
     */
    public async save() {
        const db = Model.getConnectionResolver();
        if (db && this.$table) {
            if (this.$exists) {
                await db.table(this.$table).where(this.$attributes).update(this.$attributes);
            } else {
                await db.table(this.$table).insert(this.$attributes);
                this.$exists = true;
            }
        }
        return true;
    }

    /**
     * delete method.
     * @async
     * @returns {any}
     */
    public async delete() {
        const db = Model.getConnectionResolver();
        if (db && this.$table) {
            await db.table(this.$table).where(this.$attributes).delete();
        }
        return 1;
    }

    /**
     * getDateFormat method.
     * @returns {any}
     */
    public getDateFormat() {
        return 'YYYY-MM-DD HH:mm:ss';
    }

    /**
     * setPivotKeys method.
     * @param {*} foreignKey
     * @param {*} relatedKey
     * @returns {any}
     */
    public setPivotKeys(foreignKey: any, relatedKey: any) {
        this.$foreignKey = foreignKey;
        this.$relatedKey = relatedKey;

        return this;
    }

    /**
     * fromRawAttributes method.
     * @static
     * @param {*} parent
     * @param {*} attributes
     * @param {*} table
     * @param {*} exists
     * @returns {any}
     */
    static fromRawAttributes(parent: any, attributes: Record<string, any>, table: string, exists: boolean = false) {
        const instance = new this();

        instance.setTable(table);
        instance.setRawAttributes(attributes, exists);

        return instance;
    }

    /**
     * fromAttributes method.
     * @static
     * @param {*} parent
     * @param {*} attributes
     * @param {*} table
     * @param {*} exists
     * @returns {any}
     */
    static fromAttributes(parent: any, attributes: Record<string, any>, table: string, exists: boolean = false) {
        const instance = new this();

        instance.setTable(table);
        instance.setRawAttributes(attributes, exists);

        return instance;
    }
}

export default Pivot;
