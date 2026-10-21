import ServiceProvider from '@ostro/support/serviceProvider';
import ConnectionFactory from './connectors/connectionFactory';
import DatabaseManager from './databaseManager';
import Model from './eloquent/model';

/**
 * Class DatabaseServiceProvider.
 */
class DatabaseServiceProvider extends ServiceProvider {

    /**
     * register method.
     * @returns {any}
     */
    public register() {
        this.registerProvider()
        this.bootModel()
    }

    /**
     * registerProvider method.
     * @returns {any}
     */
    public registerProvider() {

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

    /**
     * bootModel method.
     * @returns {any}
     */
    public bootModel() {
        Model.setConnectionResolver(this.$app['db']);
    }

    /**
     * boot method.
     * @returns {any}
     */
    public boot() {
        this.$app.db.registerCommands(__dirname + '/commands')
    }

}

export default DatabaseServiceProvider;