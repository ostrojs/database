const fs = require('fs')
class Sqlite {
    constructor(client, clientPackage = 'sqlite3', dbPath, migrationTable = 'migrations') {
        return client({
            client: clientPackage,
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