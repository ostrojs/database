const Knex = require('knex');

class OracleConnector {

    connect(config, database, prefix) {
        config.port = Number(config.port);

        return Knex({
            client: 'oracledb',
            version: config.version,
            connection: {
                host: config.host[0],
                port: config.port,
                user: config.username,
                database: database,
                password: config.password,
            },
            useNullAsDefault: config.useNullAsDefault != undefined ? config.useNullAsDefault : true,
            asyncStackTraces: config.asyncStackTraces != undefined ? config.asyncStackTraces : true
        });
    }
}


module.exports = OracleConnector