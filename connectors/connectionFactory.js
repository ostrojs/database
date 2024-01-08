const { random, shuffle, wrap } = require('lodash');
const Connection = require('@ostro/database/connections/connection');
const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException');
class ConnectionFactory {

    $container;

    constructor(container) {
        this.$container = container;
    }

    make(config, name = null) {
        config = this.parseConfig(config, name);

        if (config.read) {
            return this.createReadWriteConnection(config);
        }

        return this.createSingleConnection(config);
    }

    parseConfig(config, name) {
        return { ...config, prefix: '', name };
    }

    createSingleConnection(config) {
        const connection = this.createConnectionResolver(config);

        return this.createConnection(config.driver, connection, config.database, config.prefix, config);
    }

    createReadWriteConnection(config) {
        const connection = this.createSingleConnection(this.getWriteConfig(config));

        return connection.setReadConnection(this.createReadConnection(config));
    }

    createReadConnection(config) {
        return this.createConnectionResolver(this.getReadConfig(config));
    }

    getReadConfig(config) {
        return this.mergeReadWriteConfig(config, this.getReadWriteConfig(config, 'read'));
    }

    getWriteConfig(config) {
        return this.mergeReadWriteConfig(config, this.getReadWriteConfig(config, 'write'));
    }

    getReadWriteConfig(config, type) {
        return config[type] && config[type][0] ? random(config[type]) : config[type];
    }

    mergeReadWriteConfig(config, merge) {
        const { read, write, ...mergedConfig } = { ...config, ...merge };
        return mergedConfig;
    }

    createConnectionResolver(config) {
        return config.host ? this.createConnectionResolverWithHosts(config) : this.createConnectionResolverWithoutHosts(config);
    }

    createConnectionResolverWithHosts(config) {
        return (database, prefix) => {
            config = { ...config, host: this.parseHost(config) }
            return this.createConnector(config).connect(config, database, prefix);
        };
    }

    parseHost($config) {
        const hosts = Array.isArray($config['host']) ? $config['host'] : [$config['host']];
        if (empty(hosts)) {
            throw new InvalidArgumentException('Database hosts array is empty.');
        }

        return hosts;
    }


    createConnectionResolverWithoutHosts(config) {
        return (database, prefix) => {
            return this.createConnector(config).connect(config, database, prefix);
        }
    }

    createConnector(config) {
        if (!config.driver) {
            throw new Error('A driver must be specified.');
        }

        const key = `db.connector.${config.driver}`;

        if (this.$container.bound(key)) {
            return this.$container.make(key);
        }

        switch (config.driver) {
            case 'mysql':
                return new (require('./mysqlConnector'))();
            case 'pgsql':
                return new (require('./postgresConnector'))();
            case 'sqlite':
                return new (require('./sqliteConnector'))();
            case 'oracle':
                return new (require('./oracleConnector'))();
            case 'sqlsrv':
                return new (require('./sqlServerConnector'))();
            default:
                throw new Error(`Unsupported driver [${config.driver}].`);
        }
    }

    createConnection(driver, connection, database, prefix = '', config = {}) {
        const resolver = Connection.getResolver(driver);

        if (resolver) {
            return resolver(connection, database, prefix, config);
        }

        switch (driver) {
            case 'mysql':
                return new (require('../connections/mysqlConnection'))(connection, database, prefix, config);
            case 'pgsql':
                return new (require('../connections/postgresConnection'))(connection, database, prefix, config);
            case 'sqlite':
                return new (require('../connections/sqliteConnection'))(connection, database, prefix, config);
            case 'oracle':
                return new (require('../connections/oracleConnection'))(connection, database, prefix, config);
            case 'sqlsrv':
                return new (require('../connections/sqlServerConnection'))(connection, database, prefix, config);
            default:
                throw new Error(`Unsupported driver [${driver}].`);
        }
    }
}

module.exports = ConnectionFactory;
