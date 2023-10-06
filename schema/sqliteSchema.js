const Schema = require('../schema')
class SqliteSchema extends Schema {
    static async dropAllTables(db) {
        const promises = [];
        const tableNames = await db.table('sqlite_master')
            .where('type', db.getConfig('schema', 'table'))
            .whereNot('name', 'like', 'sqlite_%') // Exclude system tables
            .pluck('name');
        for (const name of tableNames) {
            promises.push(this.dropIfExists(name));
        }
        return Promise.all(promises)

    }
}

module.exports = SqliteSchema
