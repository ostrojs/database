import Builder from './builder';

/**
 * Class SqlServerBuilder.
 */
class SqlServerBuilder extends Builder {
	/* c8 ignore next */
	/**
	 * Drop all tables from the database.
	 *
	 * @returns Promise resolving when foreign keys and tables are dropped.
	 */
	async dropAllTables(): Promise<void> {
		await this.statement(this.$grammar.compileDropAllForeignKeys());
		await this.statement(this.$grammar.compileDropAllTables());
	}
}

/* c8 ignore next */
export default SqlServerBuilder;
