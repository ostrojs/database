const lodash = require('lodash')
const ConfigurationUrlParser = require('@ostro/support/configurationUrlParser');
const { Macroable } = require('@ostro/support/macro');
const lodash = require('lodash');
class DatabaseManager extends Macroable {

    $type = 'database';
    $connections = {}
    $extensions = {}
    constructor($container, $factory) {
        super()
        Object.defineProperties(this, {
            '$reconnector': {
                value: ($connection) => {
                    this.reconnect($connection.getName());
                },
                writable: true
            },
            '$app': {
                value: $container,
                writable: true
            },
            '$factory': {
                value: $factory,
                writable: false
            }
        })
    }

    builder($name = null) {
        return this.driver($name)
    }

    connection(name = null) {
        const [database, type] = this.parseConnectionName(name);
        name = name || database;

        if (!this.$connections[name]) {
            this.$connections[name] = this.configure(
                this.makeConnection(database),
                type
            );
        }

        return this.$connections[name];
    }

    parseConnectionName(name) {
        name = name || this.getDefaultConnection();
        return name.endsWith('::read') || name.endsWith('::write')
            ? name.split('::', 2)
            : [name, null];
    }

    makeConnection(name) {
        const config = this.configuration(name);

        if (this.$extensions[name]) {
            return this.$extensions[name](config, name);
        }

        const driver = config['driver'];

        if (this.$extensions[driver]) {
            return this.$extensions[driver](config, name);
        }

        return this.$factory.make(config, name);
    }
    configuration(name) {
        name = name || this.getDefaultConnection();
        const connections = lodash.get(this.$app['config'], 'database.connections');

        if (!connections[name]) {
            throw new Error(`Database connection [${name}] not configured.`);
        }

        return new ConfigurationUrlParser().parseConfiguration(connections[name]);
    }

    configure(connection, type) {
        connection.setReconnector(this.$reconnector);

        return connection;
    }

    purge($name = null) {
        $name = $name || this.getDefaultConnection();

        this.disconnect($name);

        delete this.$connections[$name];
    }


    disconnect($name = null) {
        $name = $name || this.getDefaultConnection();
        if (isset(this.$connections[$name])) {
            this.$connections[$name].disconnect();
        }
    }

    reconnect($name = null) {
        $name = $name || this.getDefaultConnection();
        this.disconnect($name);

        if (!isset(this.$connections[$name])) {
            return this.connection($name);
        }

        return this.refreshConnections($name);
    }

    usingConnection($name, $callback) {
        const $previousName = this.getDefaultConnection();

        this.setDefaultConnection($name);

        return tap($callback(), () => {
            this.setDefaultConnection($previousName);
        });
    }

    getDefaultConnection() {
        return lodash.get(this.$app['config'], 'database.default');
    }

    setDefaultConnection($name) {
        lodash.set(this.app['config'], 'database.default', $name);
    }

    supportedDrivers() {
        return ['mysql', 'pgsql', 'sqlite', 'sqlsrv', 'oracle'];
    }

    extend($name, $resolver) {
        this.$extensions[$name] = $resolver;
    }

    forgetExtension($name) {
        delete this.$extensions[$name];
    }
    getConnections() {
        return this.$connections;
    }

    setReconnector($reconnector) {
        this.$reconnector = $reconnector;
    }

    getPrefix() {
        return this.getConfig(`prefix`);
    }

    getConfig(name) {
        return lodash.get(this.$app['config'], `database.connections.${name}`);
    }

    registerCommands(dir) {
        if (this.$container.console && typeof this.$container.console.load == 'function' && env('production')) {
            this.$container.console.load(dir);
        }
    }
    __call($target, $method, $parameters) {
        return $target.connection()[$method](...$parameters);
    }

}

module.exports = DatabaseManager
