require('@ostro/support/helpers')
const knex = require('knex')
const { Macroable } = require('@ostro/support/macro')
const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException')
const DatabaseAdapter = require('./databaseAdapter')
const kApp = Symbol('app')
const kConnections = Symbol('connections')
const kCustomCreators = Symbol('customCreators')
class DatabaseManager extends Macroable {

    constructor(app) {
        super()
        Object.defineProperties(this, {
            [kApp]: {
                value: app,
            },
            [kConnections]: {
                value: Object.create(null),
                writable: true
            },
            [kCustomCreators]: {
                value: Object.create(null),
                writable: true
            },
        })
    }

    builder($name = null) {
        $name = $name || this.getDefaultDriver();
        return this[kConnections][$name] = this.getDriver($name);
    }

    connection($driver) {
        return this.driver($driver)
    }

    driver($driver) {
        return this.builder($driver);
    }

    config(key) {
        return key ? this[kApp]['config']['database'][key] : this[kApp]['config']['database']
    }

    getDriver(name) {
        return this[kConnections][name] || this.resolve(name);
    }

    resolve(name) {

        let $config = this.getConfig(name);
        if (!($config)) {
            throw new InvalidArgumentException(`Database config  [{${name}}] is not defined.`);
        }
        if ((this[kCustomCreators][$config['driver']])) {
            return this.callCustomCreator($config, name);
        } else {
            let $driverMethod = 'create' + $config['driver'].ucfirst() + 'Driver';
            if ((this[$driverMethod])) {
                return this[$driverMethod]($config, name);
            } else {
                throw new InvalidArgumentException(`Driver [{${$config['driver']}}] is not supported.`);
            }
        }
    }

    callCustomCreator($config, $name) {
        return this[kCustomCreators][$config['driver']];
    }

    createSqliteDriver($config, $name) {
        return this.adapt(new(require('./adapter/sqlite'))(knex, $config['database'], $config['migrations']), require('./schema/sqliteSchema'), $name);
    }

    createMysqlDriver($config, $name) {
        return this.adapt(new(require('./adapter/mysql'))(knex, $config, $config['migrations']), require('./schema/mysqlSchema'), $name);
    }

    createOracleDriver($config) {
        return this.adapt(new(require('./adapter/oracle'))(knex, $config, $config['migrations']), require('./schema/Oracle'), $name);
    }

    adapt($database, Schema, $name) {
        Schema = Object.create(Schema)
        return new DatabaseAdapter($database, Schema, $name);
    }

    set($name, $driver) {
        this[kConnections][$name] = $driver;
        return this;
    }

    repository($driver) {
        return this.adapt($driver);
    }

    getPrefix($config = {}) {
        return $config['prefix'] || this[kApp]['config']['database']['prefix'];
    }

    getConfig($name) {
        return this[kApp]['config']['database']['connections'][$name];
    }

    getDefaultDriver() {
        return this[kApp]['config']['database']['default'];
    }

    setDefaultDriver($name) {
        this[kApp]['config']['database']['default'] = $name;
    }

    extends($driver, $callback) {
        const config = this.getConfig($driver)
        if (!config) {
            throw new InvalidArgumentException(`Config not found for  [{${$driver}}] driver.`);
        }
        this[kCustomCreators][config['driver']] = $callback.call(this, this);
        return this;
    }

    registerCommands(dir) {
        if (this[kApp].console && typeof this[kApp].console.load == 'function' && env('production')) {
            this[kApp].console.load(dir);
        }
    }

    __get(target, method) {
        return this.make(target.driver(), method)
    }
}

module.exports = DatabaseManager