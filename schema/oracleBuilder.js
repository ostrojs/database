const Builder = require('./builder')
class OracleSchema extends Builder {
    async dropAllTables() {
        const tables = await this.getAllTables();
        const promises = [];
        for (const name of tables) {
            promises.push(this.dropIfExists(name, true));
        }
        return Promise.all(promises)

    }

    getAllTables() {
        return this.$connection.table('user_tables')
            .pluck('table_name');
    }
}

module.exports = OracleSchema