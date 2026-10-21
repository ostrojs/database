import { random, shuffle, wrap } from 'lodash';
import Connection from '../connections/connection';
import InvalidArgumentException from '@ostro/support/exceptions/invalidArgumentException';
import { empty } from '@ostro/support/function';
import MysqlConnector from './mysqlConnector';
import PostgresConnector from './postgresConnector';
import SqliteConnector from './sqliteConnector';
import OracleConnector from './oracleConnector';
import SqlServerConnector from './sqlServerConnector';
import MysqlConnection from '../connections/mysqlConnection';
import PostgresConnection from '../connections/postgresConnection';
import SqliteConnection from '../connections/sqliteConnection';
import OracleConnection from '../connections/oracleConnection';
import SqlServerConnection from '../connections/sqlServerConnection';
/**
 * Class ConnectionFactory.
 */
class ConnectionFactory {

    $container;

    /**
     * Create a new instance.
     * @param {*} container
     */
    constructor(container: any) {
        this.$container = container;
    }

    /**
     * make method.
     * @param {*} config
     * @param {*} name
     * @returns {any}
     */
    public make(config: Record<string, any>, name: any = null) {
        config = this.parseConfig(config, name);

        if (config.read) {
            return this.createReadWriteConnection(config);
        }

        return this.createSingleConnection(config);
    }

    /**
     * parseConfig method.
     * @param {*} config
     * @param {*} name
     * @returns {any}
     */
    public parseConfig(config: Record<string, any>, name: string) {
        return { prefix: '', ...config, name };
    }

    /**
     * createSingleConnection method.
     * @param {*} config
     * @returns {any}
     */
    public createSingleConnection(config: Record<string, any>) {
        const connection = this.createConnectionResolver(config);

        return this.createConnection(config.driver, connection, config.database, config.prefix, config);
    }

    /**
     * createReadWriteConnection method.
     * @param {*} config
     * @returns {any}
     */
    public createReadWriteConnection(config: Record<string, any>) {
        const connection = this.createSingleConnection(this.getWriteConfig(config));

        return connection.setReadConnection(this.createReadConnection(config));
    }

    /**
     * createReadConnection method.
     * @param {*} config
     * @returns {any}
     */
    public createReadConnection(config: Record<string, any>) {
        return this.createConnectionResolver(this.getReadConfig(config));
    }

    /**
     * getReadConfig method.
     * @param {*} config
     * @returns {any}
     */
    public getReadConfig(config: Record<string, any>) {
        return this.mergeReadWriteConfig(config, this.getReadWriteConfig(config, 'read'));
    }

    /**
     * getWriteConfig method.
     * @param {*} config
     * @returns {any}
     */
    public getWriteConfig(config: Record<string, any>) {
        return this.mergeReadWriteConfig(config, this.getReadWriteConfig(config, 'write'));
    }

    /**
     * getReadWriteConfig method.
     * @param {*} config
     * @param {*} type
     * @returns {any}
     */
    public getReadWriteConfig(config: Record<string, any>, type: string) {
        return config[type] && config[type][0] ? random(config[type]) : config[type];
    }

    /**
     * mergeReadWriteConfig method.
     * @param {*} config
     * @param {*} merge
     * @returns {any}
     */
    public mergeReadWriteConfig(config: Record<string, any>, merge: any) {
        const { read, write, ...mergedConfig } = { ...config, ...merge };
        return mergedConfig;
    }

    /**
     * createConnectionResolver method.
     * @param {*} config
     * @returns {any}
     */
    public createConnectionResolver(config: Record<string, any>) {
        return config.host ? this.createConnectionResolverWithHosts(config) : this.createConnectionResolverWithoutHosts(config);
    }

    /**
     * createConnectionResolverWithHosts method.
     * @param {*} config
     * @returns {any}
     */
    public createConnectionResolverWithHosts(config: Record<string, any>) {
        return (database, prefix) => {
            config = { ...config, host: this.parseHost(config) }
            return this.createConnector(config).connect(config, database, prefix);
        };
    }

    /**
     * parseHost method.
     * @param {*} $config
     * @returns {any}
     */
    public parseHost($config: Record<string, any>) {
        const hosts = Array.isArray($config['host']) ? $config['host'] : [$config['host']];
        if (empty(hosts)) {
            throw new InvalidArgumentException('Database hosts array is empty.');
        }

        return hosts;
    }


    /**
     * createConnectionResolverWithoutHosts method.
     * @param {*} config
     * @returns {any}
     */
    public createConnectionResolverWithoutHosts(config: Record<string, any>) {
        return (database, prefix) => {
            return this.createConnector(config).connect(config, database, prefix);
        }
    }

    /**
     * createConnector method.
     * @param {*} config
     * @returns {any}
     */
    public createConnector(config: Record<string, any>) {
        if (!config.driver) {
            throw new Error('A driver must be specified.');
        }

        const key = `db.connector.${config.driver}`;

        if (this.$container.bound(key)) {
            return this.$container.make(key);
        }

        switch (config.driver) {
            case 'mysql':
                return new MysqlConnector();
            case 'pgsql':
                return new PostgresConnector();
            case 'sqlite':
                return new SqliteConnector();
            case 'oracle':
                return new OracleConnector();
            case 'sqlsrv':
                return new SqlServerConnector();
            default:
                throw new Error(`Unsupported driver [${config.driver}].`);
        }
    }

    /**
     * createConnection method.
     * @param {*} driver
     * @param {*} connection
     * @param {*} database
     * @param {*} prefix
     * @param {*} config
     * @returns {any}
     */
    public createConnection(driver: any, connection: any, database: any, prefix: string = '', config: Record<string, any> = {}) {
        const resolver = Connection.getResolver(driver);

        if (resolver) {
            return resolver(connection, database, prefix, config);
        }

        switch (driver) {
            case 'mysql':
                return new MysqlConnection(connection, database, prefix, config);
            case 'pgsql':
                return new PostgresConnection(connection, database, prefix, config);
            case 'sqlite':
                return new SqliteConnection(connection, database, prefix, config);
            case 'oracle':
                return new OracleConnection(connection, database, prefix, config);
            case 'sqlsrv':
                return new SqlServerConnection(connection, database, prefix, config);
            default:
                throw new Error(`Unsupported driver [${driver}].`);
        }
    }
}

export default ConnectionFactory;
