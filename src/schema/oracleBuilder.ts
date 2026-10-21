import Builder from './builder';

/**
 * Class OracleSchema.
 */
class OracleSchema extends Builder {
    /* c8 ignore next */
    /**
     * Drop all tables from the database.
     *
     * @returns Promise resolving when all tables are dropped.
     */
    public async dropAllTables(): Promise<any[]> {
        const tables: string[] = await this.getAllTables();
        const promises: Promise<any>[] = [];
        for (const name of tables) {
            promises.push(this.dropIfExists(name, true));
        }
        return Promise.all(promises);
    }

    /**
     * Get all of the table names for the database.
     *
     * @returns Query promise resolving to table names.
     */
    public getAllTables(): any {
        return this.$connection.table('user_tables')
            .pluck('table_name');
    }
}

/* c8 ignore next */
export default OracleSchema;