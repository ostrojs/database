class PgSql {
    constructor(client, connection) {
        return client({
            client: 'pg',
            connection: {
                connectionString: connection.DATABASE_URL,
                host: connection.host,
                port: connection.port,
                user: connection.user,
                database: connection.database,
                password: connection.password,
                ssl: connection.ssl ? { rejectUnauthorized: false } : false,
            },
            useNullAsDefault: true,
            asyncStackTraces: true
        })
    }

}

module.exports = PgSql
