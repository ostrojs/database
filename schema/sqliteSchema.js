const Schema = require('../schema')
const fs = require('fs-extra')
class SqliteSchema extends Schema{
	static async dropAllTables(){
		await fs.remove(this.schema.client.connectionSettings.filename)
	}
} 

module.exports = SqliteSchema