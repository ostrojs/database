import Knex from 'knex';
import type { Knex as KnexType } from 'knex';

/**
 * Class MysqlConnector.
 */
class MysqlConnector {

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
            client: 'mysql2',
            version: config.version,
            connection: {
                socketPath: config.socket,
                host: config.host[0],
                port: config.port,
                user: config.username,
                database: database,
                password: config.password,
                charset: config.charset,
                timezone: config.timezone,
            },
            pool: config.pool,
            userParams: config.params,
            acquireConnectionTimeout: config.connection_timeout,
            useNullAsDefault: config.useNullAsDefault != undefined ? config.useNullAsDefault : true,
            asyncStackTraces: config.asyncStackTraces != undefined ? config.asyncStackTraces : true
        } as any);
    }
}

/* c8 ignore next */
export default MysqlConnector;
