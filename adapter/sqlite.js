const fs = require('fs')
class Sqlite {
    constructor(client, dbPath, migrationTable = 'migrations') {
        return client({
            client: 'sqlite3',
            connection: {
                filename: (dbPath)
            },
            migrations: {
                tableName: migrationTable
            },
            useNullAsDefault: true,
            asyncStackTraces: true
        })
    }

}

module.exports = Sqlite