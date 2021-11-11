const kSchema = Symbol('client')
class Schema {
    static connection(connection) {
        this.schema = connection
    }
    static create() {
        return this.schema.createTable(...arguments).then(res => true)
    }

    static drop() {
        return this.schema.dropTable(...arguments).then(res => true)
    }

    static table() {
        return this.schema.table(...arguments).then(res => true)
    }

    static has() {

        return this.schema.hasTable(...arguments).then(res => true)
    }

    static alter() {
        return this.schema.alterTable(...arguments).then(res => true)
    }

    static raw() {
        return this.schema.raw(...arguments).then(res => true)
    }

    static dropIfExists(table) {
        return this.schema.dropTableIfExists(table)

    }
    static dropAllTables() {

    }
    static dropAllViews() {

    }
    static dropAllTypes() {

    }
}
module.exports = Schema