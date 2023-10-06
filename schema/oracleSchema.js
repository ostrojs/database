class Oracle {
    constructor(client, connection) {
        return client({
            client: 'oracle',
            connection: connection,
            useNullAsDefault: true,
            asyncStackTraces: true
        })
    }

}

module.exports = Oracle
