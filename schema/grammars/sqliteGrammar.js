const Grammar = require('./grammar');

class SqliteGrammar extends Grammar {
    compileDropAllTables(tables) {
        let sql = ``;
        for (let table of tables) {
            sql += `DROP TABLE IF EXISTS ${table};`;
        }
        return sql;
    }
}

module.exports = SqliteGrammar;