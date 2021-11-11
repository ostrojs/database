const Schema = require('../schema')

class MysqlSchema extends Schema{

	static dropAllTables(){
		throw Error('dropAllTables feature does not exist.')
	}
} 

module.exports = MysqlSchema