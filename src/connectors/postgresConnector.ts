import Knex from 'knex';
import type { Knex as KnexType } from 'knex';

/**
 * Class PostgresConnector.
 */
class PostgresConnector {

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
            client: 'pg',
            version: config.version,
            connection: {
                host: config.host,
                port: config.port,
                user: config.username,
                database: database,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : false,
            },
            pool: config.pool,
            acquireConnectionTimeout: config.connection_timeout,
            searchPath: Array.isArray(config.schema) ? config.schema : [config.schema],
            useNullAsDefault: config.useNullAsDefault != undefined ? config.useNullAsDefault : true,
            asyncStackTraces: config.asyncStackTraces != undefined ? config.asyncStackTraces : true
        });
    }
}

/* c8 ignore next */
export default PostgresConnector;