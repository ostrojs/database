const Knex = require('knex');

class PostgresConnector {

    connect(config, database, prefix) {
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

module.exports = PostgresConnector