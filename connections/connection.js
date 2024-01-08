const { Macroable } = require('@ostro/support/macro');
const ObjectGet = require('lodash.get');
const QueryBuilder = require('../query/builder');
const QueryGrammar = require('../query/grammars/grammar');
const Processor = require('../query/processors/processor');
const SchemaBuilder = require('../schema/builder');
const { debounce } = require('@ostro/support/function');
class Connection extends Macroable {
    static $resolvers = {};

    $database;

    $tablePrefix;

    $config;

    $connection;

    $schemaGrammar;

    $postProcessor;

    $activeConnection = true;

    constructor(connection, $database = '', $tablePrefix = '', $config = {}) {
        super()

        this.$connection = connection($database, $tablePrefix);

        this.$database = $database;

        this.$tablePrefix = $tablePrefix;

        this.$config = $config;

        this.useDefaultQueryGrammar();

        this.initiateAutoCloseConnection();

    }

    useDefaultQueryGrammar() {
        this.$queryGrammar = this.getDefaultQueryGrammar();
    }

    getDefaultQueryGrammar() {
        let $grammar = new QueryGrammar();
        $grammar.setConnection(this);
        return $grammar;
    }

    useDefaultSchemaGrammar() {
        this.$schemaGrammar = this.getDefaultSchemaGrammar();
    }

    getDefaultSchemaGrammar() {
        //
    }

    useDefaultPostProcessor() {
        this.$postProcessor = this.getDefaultPostProcessor();
    }

    getDefaultPostProcessor() {
        return new Processor;
    }

    getSchemaBuilder() {
        if (is_null(this.$schemaGrammar)) {
            this.useDefaultSchemaGrammar();
        }

        return new SchemaBuilder(this);
    }

    table($table, $as) {
        return this.query().from($table, $as);
    }

    query() {
        return new QueryBuilder(
            this, this.getQueryGrammar(), this.$connection
        );
    }

    selectOne($query, $bindings = [], $useReadPdo = true) {
        const $records = this.select($query, $bindings, $useReadPdo);

        return $records.shift();
    }

    insert($query, $bindings = []) {
        return this.statement($query, $bindings);
    }


    update($query, $bindings = []) {
        return this.affectingStatement($query, $bindings);
    }


    delete($query, $bindings = []) {
        return this.affectingStatement($query, $bindings);
    }


    statement($query, $bindings = []) {
        return this.run($query, $bindings);
    }

    affectingStatement($query, $bindings = []) {
        return this.run($query, $bindings).then(res => {
            return res
        });
    }

    async run($query, $bindings) {
        for (let $beforeExecutingCallback of this.$beforeExecutingCallbacks) {
            $beforeExecutingCallback($query, $bindings, this);
        }

        this.reconnectIfMissingConnection();

        try {
            $result = await this.raw($query, $bindings, $callback);
        } catch ($e) {
            $result = this.handleQueryException(
                $e, $query, $bindings, $callback
            );
        }

        return $result;
    }
    reconnect() {
        if (is_callable(this.$reconnector)) {
            return this.$reconnector(this);
        }

        throw new LostConnectionException('Lost connection and no reconnector available.');
    }

    reconnectIfMissingConnection() {
        if (is_null(this.$connection)) {
            this.reconnect();
        }
    }

    beforeExecuting($callback) {
        this.$beforeExecutingCallbacks.push($callback);
        return this;
    }

    raw($value) {
        return this.$connection.raw($value);
    }

    setReconnector($reconnector) {
        this.$reconnector = $reconnector;

        return this;
    }

    getName() {
        return this.getConfig('name');
    }

    getConfig($key, $default) {
        return ObjectGet(this.$config, $key, $default);
    }

    getDriverName() {
        return this.getConfig('driver');
    }

    getQueryGrammar() {
        return this.$queryGrammar;
    }

    setQueryGrammar($grammar) {
        this.$queryGrammar = $grammar;

        return this;
    }

    getSchemaGrammar() {
        return this.$schemaGrammar;
    }

    setSchemaGrammar($grammar) {
        this.$schemaGrammar = $grammar;

        return this;
    }

    setPostProcessor($processor) {
        this.$postProcessor = $processor;
        return this;
    }

    getPostProcessor() {
        return this.$postProcessor;
    }

    getDatabaseName() {
        return this.$database;
    }

    setDatabaseName($database) {
        this.$database = $database;

        return this;
    }

    getTablePrefix() {
        return this.$tablePrefix;
    }

    setTablePrefix($prefix) {
        this.$tablePrefix = $prefix;

        this.getQueryGrammar().setTablePrefix($prefix);

        return this;
    }

    withTablePrefix($grammar) {
        $grammar.setTablePrefix(this.$tablePrefix);

        return $grammar;
    }


    disconnect() {
        this.$connection.destroy();
        this.$activeConnection = false
    }

    initiateAutoCloseConnection() {
        let connectionCount = 0;
        let closeTime = this.$config['connectionCloseTime'] || 5000;
        let destroy = this.$config['destroy'] || true;

        const disconnectConnection = debounce(() => {
            if (destroy) {
                this.disconnect();
                this.$activeConnection = false;
            }
        }, closeTime);
        const acquireConnection = this.$connection.client.acquireConnection.bind(this.$connection.client)
        this.$connection.client.acquireConnection = () => {
            connectionCount++;
            disconnectConnection.clear();
            if (!this.$activeConnection) {
                this.$connection.initialize();
                this.$activeConnection = true;
            }
            return acquireConnection();
        };

        const closeConnection = () => {
            if (connectionCount > 0) {
                connectionCount--;
            }
            if (connectionCount == 0) {
                disconnectConnection();
            }
        };

        this.$connection.client.on('query-error', closeConnection);
        this.$connection.client.on('query-response', closeConnection);
    }


    static resolverFor($driver, $callback) {
        this.$resolvers[$driver] = $callback;
    }

    static getResolver($driver) {
        return this.$resolvers[$driver] || null;
    }
}

module.exports = Connection
