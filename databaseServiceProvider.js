const ServiceProvider = require('@ostro/support/serviceProvider');
const ConnectionFactory = require('@ostro/database/connectors/connectionFactory');
const DatabaseManager = require('./databaseManager');
const Model = require('./eloquent/model');

class DatabaseServiceProvider extends ServiceProvider {

    register() {
        this.registerProvider()
        this.bootModel()
    }

    registerProvider() {

        // Model.clearBootedModels();

        this.$app.singleton('db.factory', function ($app) {
            return new ConnectionFactory($app);
        });

        this.$app.singleton('db', function ($app) {
            return new DatabaseManager($app, $app['db.factory']);
        });

        this.$app.bind('db.connection', function ($app) {
            return $app['db'].connection();
        });

        this.$app.bind('db.schema', function ($app) {
            return $app['db'].connection().getSchemaBuilder();
        });
    }

    bootModel() {
        Model.setConnectionResolver(this.$app['db']);
    }

    boot() {
        this.$app.db.registerCommands(__dirname + '/commands')
    }

}
module.exports = DatabaseServiceProvider