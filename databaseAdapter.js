const QueryBuilder = require('./QueryBuilder')
const { Macroable } = require('@ostro/support/macro')
const kAdapter = Symbol('adapter')
const kSchema = Symbol('schema')
const kConnectionName = Symbol('connectionName')
const { debounce } = require('@ostro/support/function')
const ObjectGet = require('lodash.get');
const kConfig = Symbol('config')
class DatabaseAdapter extends Macroable {
    constructor($adapter, $schema, $name, $config = {}) {
        super()
        this[kAdapter] = $adapter;
        this[kConnectionName] = $name;
        $schema.connection($adapter['schema']);
        this[kSchema] = $schema;
        this.active = true;
        let closeTime = $config['connectionCloseTime'] || 1000;
        let destroy = $config['destroy'] || true;
        this.$schemaName = $config['schema'];
        this[kConfig] = $config;
        let disconnectConnection = debounce(() => {
            if (destroy == true) {
                this.destroy();
                this.active = false;
            }

        }, closeTime);



        let i = 0;

        let acquireConnection = this[kAdapter].client.acquireConnection.bind(this[kAdapter].client);

        this[kAdapter].client.acquireConnection = () => {
            i++;
            disconnectConnection.clear();
            if (this.active == false) {
                this[kAdapter].initialize();
                this.active = true;
            }
            return acquireConnection()
        }

        let closeConnection = function () {
            i--;
            if (i == 0) {
                disconnectConnection();
            }
        }

        this[kAdapter].client.on('query-error', function () {
            closeConnection();
        })

        this[kAdapter].client.on('query-response', function () {
            closeConnection();
        })



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

    getColumnListing(tableName) {
        return this.table(tableName).columnInfo().then(columns => Object.keys(columns));
    }

    getName() {
        return this[kConnectionName]
    }

    destroy() {
        return this[kAdapter].destroy()
    }

    getSchemaName() {
        return this.$schemaName
    }

    getConfig(key, value) {
        return ObjectGet(this[kConfig], key, value);
    }
}

module.exports = DatabaseAdapter
