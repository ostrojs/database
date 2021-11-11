const ServiceProvider = require('@ostro/support/serviceProvider');
const DatabaseManager = require('./databaseManager')
const Model = require('./eloquent/model')
class DatabaseServiceProvider extends ServiceProvider {

    register() {
        this.registerProvider()
        this.bootModel()
    }

    registerProvider() {
        this.$app.singleton('db', function(app) {
            return new DatabaseManager(app);
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