const Knex = require('knex');

class MysqlConnector {

    connect(config, database, prefix) {
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
        });
    }
}

module.exports = MysqlConnector
