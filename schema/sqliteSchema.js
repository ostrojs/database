class Sqlite {
    constructor(client, clientPackage = 'sqlite3', dbPath) {
        return client({
            client: clientPackage,
            connection: {
                filename: (dbPath)
            },
            useNullAsDefault: true,
            asyncStackTraces: true
        })
    }

}

module.exports = Sqlite
