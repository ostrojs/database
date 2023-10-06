const Schema = require('../schema')
class OracleSchema extends Schema {
    static async dropAllTables(db) {
        const promises = [];
        const tableNames = await db.table('user_tables')
            .pluck('table_name');
        for (const name of tableNames) {
            promises.push(this.dropIfExists(name));
        }
        return Promise.all(promises)

    }
}

module.exports = OracleSchema