const Knex = require('knex');

class SqlServerConnector {
    connect(config, database, prefix) {
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

module.exports = SqlServerConnector