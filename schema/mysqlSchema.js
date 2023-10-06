const Schema = require('../schema')
class MysqlSchema extends Schema {
	static async dropAllTables(db) {
		const promises = [];
		const tableNames = await db.table('information_schema.tables')
			.where('table_schema', db.getConfig('database')) // Replace with your database name
			.andWhere('table_type', 'BASE TABLE')
			.pluck('table_name');
		for (const name of tableNames) {
			promises.push(this.dropIfExists(name));
		}
		return await Promise.all(promises).then(res => true);

	}
}

module.exports = MysqlSchema
