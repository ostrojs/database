import { Macroable } from '@ostro/support/macro';
import type { Knex } from 'knex';
import ObjectGet from 'lodash.get';
import QueryBuilder from '../query/builder';
import QueryGrammar from '../query/grammars/grammar';
import Processor from '../query/processors/processor';
import SchemaBuilder from '../schema/builder';
import { debounce, is_callable, is_null } from '@ostro/support/function';

/**
 * Class LostConnectionException.
 */
class LostConnectionException extends Error {
    /**
     * Create a new instance.
     * @param {*} message
     */
    constructor(message: string = 'Lost connection and no reconnector available.') {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Class Connection.
 */
class Connection extends Macroable {
    static $resolvers = {};

    $database: string;

    $tablePrefix: string;

    $config: Record<string, any>;

    $connection: Knex | any;

    $schemaGrammar;

    $postProcessor;

    $activeConnection = true;

    $beforeExecutingCallbacks = [];

    /**
     * Create a new instance.
     * @param {*} connection
     * @param {*} $database
     * @param {*} $tablePrefix
     * @param {*} $config
     */
    constructor(connection: any, $database: string = '', $tablePrefix: string = '', $config: Record<string, any> = {}) {
        super()

        this.$connection = typeof connection === 'function' ? connection($database, $tablePrefix) : connection;

        this.$database = $database;

        this.$tablePrefix = $tablePrefix;

        this.$config = $config;

        this.useDefaultQueryGrammar();
        this.useDefaultPostProcessor();

        if (this.$connection) {
            this.initiateAutoCloseConnection();
        }

    }

    /**
     * useDefaultQueryGrammar method.
     * @returns {any}
     */
    public useDefaultQueryGrammar() {
        this.$queryGrammar = this.getDefaultQueryGrammar();
    }

    /**
     * getDefaultQueryGrammar method.
     * @returns {any}
     */
    public getDefaultQueryGrammar() {
        let $grammar = new QueryGrammar();
        $grammar.setConnection(this);
        return $grammar;
    }

    /**
     * useDefaultSchemaGrammar method.
     * @returns {any}
     */
    public useDefaultSchemaGrammar() {
        this.$schemaGrammar = this.getDefaultSchemaGrammar();
    }

    /**
     * getDefaultSchemaGrammar method.
     * @returns {any}
     */
    public getDefaultSchemaGrammar() {
        //
    }

    /**
     * useDefaultPostProcessor method.
     * @returns {any}
     */
    public useDefaultPostProcessor() {
        this.$postProcessor = this.getDefaultPostProcessor();
    }

    /**
     * getDefaultPostProcessor method.
     * @returns {any}
     */
    public getDefaultPostProcessor() {
        return new Processor;
    }

    /**
     * getSchemaBuilder method.
     * @returns {any}
     */
    public getSchemaBuilder() {
        if (is_null(this.$schemaGrammar)) {
            this.useDefaultSchemaGrammar();
        }

        return new SchemaBuilder(this);
    }

    /**
     * table method.
     * @param {*} $table
     * @param {*} $as
     * @returns {any}
     */
    public table($table: string, $as: any) {
        return this.query().from($table, $as);
    }

    /**
     * query method.
     * @returns {any}
     */
    public query() {
        return new QueryBuilder(
            this, this.getQueryGrammar(), this.$connection
        );
    }

    /**
     * transaction method.
     * @param {*} callback
     * @returns {any}
     */
    public transaction(callback: Function) {
        return this.$connection.transaction(callback);
    }

    /**
     * select method.
     * @async
     * @param {*} $query
     * @param {*} $bindings
     * @param {*} $useReadPdo
     * @returns {any}
     */
    public async select($query: any, $bindings: any[] = [], $useReadPdo: boolean = true) {
        return this.run($query, $bindings);
    }

    /**
     * selectOne method.
     * @async
     * @param {*} $query
     * @param {*} $bindings
     * @param {*} $useReadPdo
     * @returns {any}
     */
    public async selectOne($query: any, $bindings: any[] = [], $useReadPdo: boolean = true) {
        const $records = await this.select($query, $bindings, $useReadPdo);

        return Array.isArray($records) ? $records[0] : $records;
    }

    /**
     * insert method.
     * @param {*} $query
     * @param {*} $bindings
     * @returns {any}
     */
    public insert($query: any, $bindings: any[] = []) {
        return this.statement($query, $bindings);
    }


    /**
     * update method.
     * @param {*} $query
     * @param {*} $bindings
     * @returns {any}
     */
    public update($query: any, $bindings: any[] = []) {
        return this.affectingStatement($query, $bindings);
    }


    /**
     * delete method.
     * @param {*} $query
     * @param {*} $bindings
     * @returns {any}
     */
    public delete($query: any, $bindings: any[] = []) {
        return this.affectingStatement($query, $bindings);
    }


    /**
     * statement method.
     * @param {*} $query
     * @param {*} $bindings
     * @returns {any}
     */
    public statement($query: any, $bindings: any[] = []) {
        return this.run($query, $bindings);
    }

    /**
     * affectingStatement method.
     * @param {*} $query
     * @param {*} $bindings
     * @returns {any}
     */
    public affectingStatement($query: any, $bindings: any[] = []) {
        return this.run($query, $bindings).then(res => {
            return res
        });
    }

    /**
     * run method.
     * @async
     * @param {*} $query
     * @param {*} $bindings
     * @param {*} $callback
     * @returns {any}
     */
    public async run($query: any, $bindings: any[], $callback: any = null) {
        for (let $beforeExecutingCallback of this.$beforeExecutingCallbacks) {
            $beforeExecutingCallback($query, $bindings, this);
        }

        this.reconnectIfMissingConnection();

        let $result;
        try {
            $result = await this.raw($query, $bindings, $callback);
        } catch ($e) {
            $result = this.handleQueryException(
                $e, $query, $bindings, $callback
            );
        }

        return $result;
    }
    /**
     * reconnect method.
     * @returns {any}
     */
    public reconnect() {
        if (is_callable(this.$reconnector)) {
            return this.$reconnector(this);
        }

        throw new LostConnectionException('Lost connection and no reconnector available.');
    }

    /**
     * reconnectIfMissingConnection method.
     * @returns {any}
     */
    public reconnectIfMissingConnection() {
        if (is_null(this.$connection)) {
            this.reconnect();
        }
    }

    /**
     * beforeExecuting method.
     * @param {*} $callback
     * @returns {any}
     */
    public beforeExecuting($callback: Function) {
        this.$beforeExecutingCallbacks.push($callback);
        return this;
    }

    /**
     * raw method.
     * @param {*} $value
     * @returns {any}
     */
    public raw($value: any, ...args: any[]) {
        return this.$connection.raw($value, ...args);
    }

    /**
     * setReconnector method.
     * @param {*} $reconnector
     * @returns {any}
     */
    public setReconnector($reconnector: any) {
        this.$reconnector = $reconnector;

        return this;
    }

    /**
     * getName method.
     * @returns {any}
     */
    public getName() {
        return this.getConfig('name');
    }

    /**
     * getConfig method.
     * @param {*} $key
     * @param {*} $default
     * @returns {any}
     */
    public getConfig($key: string, $default: any = null) {
        return ObjectGet(this.$config, $key, $default);
    }

    /**
     * getDriverName method.
     * @returns {any}
     */
    public getDriverName() {
        return this.getConfig('driver');
    }

    /**
     * getQueryGrammar method.
     * @returns {any}
     */
    public getQueryGrammar() {
        return this.$queryGrammar;
    }

    /**
     * setQueryGrammar method.
     * @param {*} $grammar
     * @returns {any}
     */
    public setQueryGrammar($grammar: any) {
        this.$queryGrammar = $grammar;

        return this;
    }

    /**
     * getSchemaGrammar method.
     * @returns {any}
     */
    public getSchemaGrammar() {
        return this.$schemaGrammar;
    }

    /**
     * setSchemaGrammar method.
     * @param {*} $grammar
     * @returns {any}
     */
    public setSchemaGrammar($grammar: any) {
        this.$schemaGrammar = $grammar;

        return this;
    }

    /**
     * setPostProcessor method.
     * @param {*} $processor
     * @returns {any}
     */
    public setPostProcessor($processor: any) {
        this.$postProcessor = $processor;
        return this;
    }

    /**
     * getPostProcessor method.
     * @returns {any}
     */
    public getPostProcessor() {
        return this.$postProcessor;
    }

    /**
     * getDatabaseName method.
     * @returns {any}
     */
    public getDatabaseName() {
        return this.$database;
    }

    /**
     * setReadConnection method.
     * @param {*} $readConnection
     * @returns {any}
     */
    public setReadConnection($readConnection: any) {
        this.$readConnection = $readConnection;
        return this;
    }

    /**
     * getReadConnection method.
     * @returns {any}
     */
    public getReadConnection() {
        if (this.$readConnection) {
            return typeof this.$readConnection === 'function' ? this.$readConnection(this.$database, this.$tablePrefix) : this.$readConnection;
        }
        return this.$connection;
    }

    /**
     * setDatabaseName method.
     * @param {*} $database
     * @returns {any}
     */
    public setDatabaseName($database: any) {
        this.$database = $database;

        return this;
    }

    /**
     * getTablePrefix method.
     * @returns {any}
     */
    public getTablePrefix() {
        return this.$tablePrefix;
    }

    /**
     * setTablePrefix method.
     * @param {*} $prefix
     * @returns {any}
     */
    public setTablePrefix($prefix: any) {
        this.$tablePrefix = $prefix;

        this.getQueryGrammar().setTablePrefix($prefix);

        return this;
    }

    /**
     * withTablePrefix method.
     * @param {*} $grammar
     * @returns {any}
     */
    public withTablePrefix($grammar: any) {
        $grammar.setTablePrefix(this.$tablePrefix);

        return $grammar;
    }

    /**
     * getColumnListing method.
     * @param {*} $table
     * @returns {any}
     */
    public getColumnListing($table: string) {
        return this.getSchemaBuilder().getColumnListing($table);
    }


    /**
     * disconnect method.
     * @returns {any}
     */
    public disconnect() {
        if (this.$disconnectTimer) {
            this.$disconnectTimer.clear();
        }
        if (this.$connection && typeof this.$connection.destroy === 'function') {
            this.$connection.destroy();
        }
        this.$activeConnection = false;
    }

    /**
     * initiateAutoCloseConnection method.
     * @returns {any}
     */
    public initiateAutoCloseConnection() {
        let connectionCount = 0;
        let closeTime = this.$config['connectionCloseTime'] || 5000;
        let destroy = this.$config['destroy'] || true;

        const disconnectConnection = debounce(() => {
            if (destroy) {
                this.disconnect();
                this.$activeConnection = false;
            }
        }, closeTime);
        this.$disconnectTimer = disconnectConnection;

        if (!this.$connection?.client || typeof this.$connection.client.acquireConnection !== 'function') {
            return;
        }

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


    /**
     * resolverFor method.
     * @static
     * @param {*} $driver
     * @param {*} $callback
     * @returns {any}
     */
    static resolverFor($driver: any, $callback: Function) {
        this.$resolvers[$driver] = $callback;
    }

    /**
     * getResolver method.
     * @static
     * @param {*} $driver
     * @returns {any}
     */
    static getResolver($driver: any) {
        return this.$resolvers[$driver] || null;
    }
}

export default Connection;
