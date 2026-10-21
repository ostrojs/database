import Builder from './builder';

/**
 * Class MySqlBuilder.
 */
class MySqlBuilder extends Builder {

	/* c8 ignore next */
	/**
	 * Drop all tables from the database.
	 *
	 * @returns Promise that resolves when all tables are dropped.
	 */
	async dropAllTables(): Promise<void> {
		const tables: string[] = await this.getAllTables();
		if (tables.length > 0) {
			await this.statement(this.$grammar.compileDropAllTables(tables));
		}
	}

	/**
	 * Get all of the table names for the database.
	 *
	 * @returns Query promise resolving to table names.
	 */
	getAllTables(): any {
		return this.$connection.table('information_schema.tables')
			.where('table_schema', this.$connection.getConfig('database'))
			.where('table_type', 'BASE TABLE')
			.pluck('TABLE_NAME');
	}

}

/* c8 ignore next */
export default MySqlBuilder;
