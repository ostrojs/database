import Grammar from './grammar';

/**
 * Class SqlServerGrammar.
 */
class SqlServerGrammar extends Grammar {
    /* c8 ignore next */
    /**
     * Compile the SQL to drop all foreign keys.
     *
     * @returns SQL query string.
     */
    public compileDropAllForeignKeys(): string {
        return `DECLARE @sql NVARCHAR(MAX) = N'';
            SELECT @sql += 'ALTER TABLE '
                + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + + QUOTENAME(OBJECT_NAME(parent_object_id))
                + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
            FROM sys.foreign_keys;
            EXEC sp_executesql @sql;
        `;
    }

    /**
     * Compile the SQL to drop all tables.
     *
     * @returns SQL query string.
     */
    public compileDropAllTables(): string {
        return `DECLARE @sql NVARCHAR(MAX) = N'';

            SELECT @sql += N'DROP TABLE ' + QUOTENAME(schema_name(schema_id)) + '.' + QUOTENAME(name) + ';'
            FROM sys.tables;
            EXEC sp_executesql @sql;
        
        `;
    }
}

/* c8 ignore next */
export default SqlServerGrammar;