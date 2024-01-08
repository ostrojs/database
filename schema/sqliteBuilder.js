const Builder = require('./builder');

class SqliteBuilder extends Builder {
    getAllTables() {
        return this.$connection.table('sqlite_master')
            .where('type', this.$connection.getConfig('schema', 'table'))
            .whereNot('name', 'like', 'sqlite_%') // Exclude system tables
            .pluck('name');
    }
    async dropAllTables() {
        const tables = await this.getAllTables();
        if (tables.length) {
            let foreign_key = await this.statement('PRAGMA foreign_keys;');
            foreign_key = Array.isArray(foreign_key) && foreign_key.length ? foreign_key[0] : {};
            foreign_key = foreign_key.foreign_keys == 1 ? 'ON' : 'OFF';
            await this.statement('PRAGMA foreign_keys = OFF;');
            const p = [];
            for (let table of tables) {
                p.push(this.dropTableIfExists(table))
            }
            await Promise.all(p)
            this.statement(`PRAGMA foreign_keys = ${foreign_key};`);

        }
    }

}

module.exports = SqliteBuilder
