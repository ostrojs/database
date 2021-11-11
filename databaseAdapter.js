const QueryBuilder = require('./QueryBuilder')
const { Macroable } = require('@ostro/support/macro')
const knex = require('knex')
const kAdapter = Symbol('adapter')
const kSchema = Symbol('schema')
const kConnectionName = Symbol('connectionName')
class DatabaseAdapter extends Macroable {
    constructor($adapter, $schema, $name) {
        super()
        this[kAdapter] = $adapter;
        this[kConnectionName] = $name;
        $schema.connection($adapter['schema']);

        this[kSchema] = $schema;
    }

    table(name) {
        return (new QueryBuilder(this[kAdapter].table(name)))
    }

    query(query) {
        return this[kAdapter].raw(query)
    }
    raw() {
        return this[kAdapter].raw(...arguments)
    }

    getConnection() {
        return this[kAdapter].connection()
    }

    getQueryBuilder() {
        return this[kAdapter]
    }
    schema() {
        return this[kSchema]
    }

    getSchemaBuilder() {
        return this[kAdapter]['schema']
    }

    getName() {
        return this[kConnectionName]
    }
}

module.exports = DatabaseAdapter