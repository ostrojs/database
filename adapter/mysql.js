class Mysql {
    constructor(client, connection, migrationTable = 'migrations') {

        connection.port = Number(connection.port)
        return client({
            client: connection.package || 'mysql',
            connection: {
                host: connection.host,
                port: connection.port,
                user: connection.user,
                password: connection.password,
                database: connection.database
            },
            migrations: {
                tableName: migrationTable
            },
            useNullAsDefault: true,
            asyncStackTraces: true,
            pool: connection.pool || {}
        })
    }

}

module.exports = Mysql