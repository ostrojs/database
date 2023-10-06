const Schema = require('../schema')
class PgSqlSchema extends Schema {
    static async dropAllTables(db) {
        const promises = [];
        const tableNames = await db.table('pg_tables')
            .where('schemaname', db.getConfig('schema', 'public'))
            .pluck('tablename');
        for (const name of tableNames) {
            // promises.push(this.dropIfExists(name));
        }
        return Promise.all(promises)

    }
}

module.exports = PgSqlSchema
