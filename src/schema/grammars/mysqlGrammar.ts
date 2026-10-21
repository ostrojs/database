import Grammar from './grammar';

/**
 * Class MysqlGrammar.
 */
class MysqlGrammar extends Grammar {
    /* c8 ignore next */
    /**
     * Compile a drop all tables statement.
     *
     * @param tables - Table names array.
     * @returns Drop SQL string.
     */
    public compileDropAllTables(tables: string[]): string {
        return `DROP TABLE IF EXISTS ${tables.join(', ')}; `;
    }
}

export default MysqlGrammar;