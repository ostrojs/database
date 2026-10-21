import Knex from 'knex';
import type { Knex as KnexType } from 'knex';

/**
 * Class SqlServerConnector.
 */
class SqlServerConnector {
    /**
     * Establish a database connection.
     *
     * @param config - Database configuration.
     * @param database - Database name.
     * @param prefix - Table prefix.
     * @returns Knex client instance.
     */
    public connect(config: Record<string, any>, database: any, prefix: any): KnexType {
        config.port = Number(config.port);
        return Knex({
            client: 'mssql',
            version: config.version,
            connection: {
                connectionString: config.DATABASE_URL,
                host: config.host[0],
                port: config.port,
                user: config.username,
                database: database,
                password: config.password,
                options: {
                    encrypt: config.encrypt
                },
            },
            pool: config.pool,
            acquireConnectionTimeout: config.connection_timeout,
            useNullAsDefault: config.useNullAsDefault != undefined ? config.useNullAsDefault : true,
            asyncStackTraces: config.asyncStackTraces != undefined ? config.asyncStackTraces : true
        });

    }
}

/* c8 ignore next */
export default SqlServerConnector;