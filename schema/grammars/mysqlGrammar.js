const Grammar = require('./grammar');

class MysqlGrammar extends Grammar {
    compileDropAllTables(tables) {
        return `DROP TABLE IF EXISTS ${tables.join(', ')}; `;
    }
}

module.exports = MysqlGrammar;