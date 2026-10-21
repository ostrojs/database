import Builder from './builder';

/**
 * Class SqliteBuilder.
 */
class SqliteBuilder extends Builder {
    /* c8 ignore next */
    /**
     * Get all of the table names for the database.
     *
     * @returns Query promise resolving to table names.
     */
    public getAllTables(): any {
        return this.$connection.table('sqlite_master')
            .where('type', this.$connection.getConfig('schema', 'table'))
            .whereNot('name', 'like', 'sqlite_%')
            .pluck('name');
    }

    /**
     * Drop all tables from the database.
     *
     * @returns Promise resolving when all tables are dropped.
     */
    public async dropAllTables(): Promise<void> {
        const tables: string[] = await this.getAllTables();
        if (tables.length) {
            let foreign_key: any = await this.statement('PRAGMA foreign_keys;');
            foreign_key = Array.isArray(foreign_key) && foreign_key.length ? foreign_key[0] : {};
            foreign_key = foreign_key.foreign_keys == 1 ? 'ON' : 'OFF';
            await this.statement('PRAGMA foreign_keys = OFF;');
            const p: Promise<any>[] = [];
            for (const table of tables) {
                p.push(this.dropTableIfExists(table));
            }
            await Promise.all(p);
            this.statement(`PRAGMA foreign_keys = ${foreign_key};`);
        }
    }

}

/* c8 ignore next */
export default SqliteBuilder;
