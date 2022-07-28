class Mysql {
    constructor(client, package = 'mysql', connection, migrationTable = 'migrations') {

        connection.port = Number(connection.port)
        return client({
            client: package,
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