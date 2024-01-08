const Builder = require('./builder');

class SqlServerBuilder extends Builder {
	async dropAllTables() {
		await this.statement(this.$grammar.compileDropAllForeignKeys())
		await this.statement(this.$grammar.compileDropAllTables())

	}
}

module.exports = SqlServerBuilder
