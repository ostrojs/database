import Grammar from './grammar';

/**
 * Class SqliteGrammar.
 */
class SqliteGrammar extends Grammar {
    /* c8 ignore next */
    /**
     * Compile the SQL to drop all tables.
     *
     * @param tables - Table names array.
     * @returns SQL query string.
     */
    public compileDropAllTables(tables: string[]): string {
        let sql: string = '';
        for (const table of tables) {
            sql += `DROP TABLE IF EXISTS ${table};`;
        }
        return sql;
    }
}

/* c8 ignore next */
export default SqliteGrammar;