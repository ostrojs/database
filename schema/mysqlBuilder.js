const Builder = require('./builder')
class MySqlBuilder extends Builder {

	async dropAllTables() {
		const tables = await this.getAllTables();
		if (tables.length > 0) {
			await this.statement(this.$grammar.compileDropAllTables(tables));
		}

	}

	getAllTables() {
		return this.$connection.table('information_schema.tables')
			.where('table_schema', this.$connection.getConfig('database')) // Replace with your database name
			.where('table_type', 'BASE TABLE')
			.pluck('TABLE_NAME');
	}


}

module.exports = MySqlBuilder
