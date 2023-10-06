require('@ostro/support/helpers')
const knex = require('knex')
const Manager = require('@ostro/support/manager')
const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException')
const DatabaseAdapter = require('./databaseAdapter')
class DatabaseManager extends Manager {

    $type = 'database';

    builder($name = null) {
        return this.driver($name)
    }

    connection($driver) {
        return this.driver($driver)
    }

    resolve(name) {

        let $config = this.getConfig(name);
        if (!($config)) {
            throw new InvalidArgumentException(`Database config  [{${name}}] is not defined.`);
        }
        return super.resolve(name, $config)
    }

    createSqliteDriver($config, $name) {
        return this.adapt(new (require('./adapter/sqlite'))(knex, 'sqlite3', $config['database'], $config['migrations']), require('./schema/sqliteSchema'), $name, $config);
    }

    createMysqlDriver($config, $name) {
        return this.adapt(new (require('./adapter/mysql'))(knex, 'mysql', $config, $config['migrations']), require('./schema/mysqlSchema'), $name, $config);
    }
    createMysql2Driver($config, $name) {
        return this.adapt(new (require('./adapter/mysql'))(knex, 'mysql2', $config, $config['migrations']), require('./schema/mysqlSchema'), $name, $config);
    }
    createPgsqlDriver($config, $name) {
        return this.adapt(new (require('./adapter/pgsql'))(knex, $config, $config['migrations']), require('./schema/pgsqlSchema'), $name, $config);
    }

    createOracleDriver($config, $name) {
        return this.adapt(new (require('./adapter/oracle'))(knex, $config, $config['migrations']), require('./schema/Oracle'), $name, $config);
    }

    adapt($database, Schema, $name, $config) {
        Schema = Object.create(Schema)
        return new DatabaseAdapter($database, Schema, $name, $config);
    }

    repository($driver) {
        return this.adapt($driver);
    }

    getPrefix() {
        return this.getConfig(`prefix`);
    }

    getConfig(name) {
        return super.getConfig(`connections.${name}`);
    }

    registerCommands(dir) {
        if (this.$container.console && typeof this.$container.console.load == 'function' && env('production')) {
            this.$container.console.load(dir);
        }
    }

}

module.exports = DatabaseManager
