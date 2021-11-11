class Oracle {
    constructor(client, connection, migrationTable = 'migrations') {
        return client({
            client: 'oracle',
            connection: connection,
            migrations: {
                tableName: migrationTable
            },
            useNullAsDefault: true,
            asyncStackTraces: true
        })
    }

}

module.exports = Oracle