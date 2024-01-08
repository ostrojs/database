const Connection = require('./connection');
const SchemaGrammar = require('../schema/grammars/mysqlGrammar');
const QueryGrammar = require('../query/grammars/mysqlGrammar');
const QueryProcessor = require('../query/processors/mysqlProcessor');
const SchemaBuilder = require('../schema/mysqlBuilder');

class MysqlConnection extends Connection {
    getDefaultSchemaGrammar() {
        const $grammar = new SchemaGrammar
        $grammar.setConnection(this);

        return this.withTablePrefix($grammar)
    }

    getDefaultQueryGrammar() {
        const $grammar = new QueryGrammar()
        $grammar.setConnection(this);

        return this.withTablePrefix($grammar);
    }

    getSchemaBuilder() {
        if (is_null(this.$schemaGrammar)) {
            this.useDefaultSchemaGrammar();
        }

        return new SchemaBuilder(this);
    }

    getDefaultPostProcessor() {
        return new QueryProcessor;
    }

    __call(target, method, parameters) {
        return target.$connection[method](...parameters)
    }

}

module.exports = MysqlConnection