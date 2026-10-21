import ServiceProvider from '@ostro/support/serviceProvider';
import MigrateCommand from './console/migrations/migrateCommand';
import MigrateMakeCommand from './console/migrations/migrationMakeCommand';
import Migrator from './migrations/migrator';
import MigrationCreator from './migrations/migrationCreator';
import InstallCommand from './console/migrations/installCommand';
import FreshCommand from './console/migrations/freshCommand';
import RefreshCommand from './console/migrations/refreshCommand';
import ResetCommand from './console/migrations/resetCommand';
import RollbackCommand from './console/migrations/rollbackCommand';
import StatusCommand from './console/migrations/statusCommand';
import DatabaseMigrationRepository from './migrations/databaseMigrationRepository';
/**
 * Class MigrationServiceProvider.
 */
class MigrationServiceProvider extends ServiceProvider {

    $commands = {
        'Migrate': 'command.migrate',
        'MigrateFresh': 'command.migrate.fresh',
        'MigrateInstall': 'command.migrate.install',
        'MigrateRefresh': 'command.migrate.refresh',
        'MigrateReset': 'command.migrate.reset',
        'MigrateRollback': 'command.migrate.rollback',
        'MigrateStatus': 'command.migrate.status',
        'MigrateMake': 'command.migrate.make',
    };

    /**
     * register method.
     * @returns {any}
     */
    public register() {
        this.registerRepository();

        this.registerMigrator();

        this.registerCreator();

        this.registerCommands(this.$commands);
    }

    /**
     * registerRepository method.
     * @returns {any}
     */
    public registerRepository() {
        this.$app.singleton('migration.repository', function ($app) {
            let $table = $app['config']['database.migrations'];

            return new DatabaseMigrationRepository($app['db'], $table);
        });
    }

    /**
     * registerMigrator method.
     * @returns {any}
     */
    public registerMigrator() {
        this.$app.singleton('migrator', function ($app) {
            let $repository = $app['migration.repository'];
            return new Migrator($repository, $app['db'], $app['files']);
        });
    }

    /**
     * registerCreator method.
     * @returns {any}
     */
    public registerCreator() {
        this.$app.singleton('migration.creator', function ($app) {
            return new MigrationCreator($app['files'], $app.basePath('stubs'));
        });
    }

    /**
     * registerCommands method.
     * @param {*} $commands
     * @returns {any}
     */
    public registerCommands($commands: Record<string, any> = {}) {
        for (let $command of Object.keys($commands)) {
            this[`register${$command}Command`]();
        }

        this.commands(Object.values($commands));
    }

    /**
     * registerMigrateCommand method.
     * @returns {any}
     */
    public registerMigrateCommand() {
        this.$app.singleton('command.migrate', function ($app) {
            return new MigrateCommand($app['migrator'], $app['files']);
        });
    }

    /**
     * registerMigrateFreshCommand method.
     * @returns {any}
     */
    public registerMigrateFreshCommand() {
        this.$app.singleton('command.migrate.fresh', function () {
            return new FreshCommand();
        });
    }

    /**
     * registerMigrateRefreshCommand method.
     * @returns {any}
     */
    public registerMigrateRefreshCommand() {
        this.$app.singleton('command.migrate.refresh', function () {
            return new RefreshCommand();
        });
    }

    /**
     * registerMigrateInstallCommand method.
     * @returns {any}
     */
    public registerMigrateInstallCommand() {
        this.$app.singleton('command.migrate.install', function ($app) {
            return new InstallCommand($app['migration.repository']);
        });
    }

    /**
     * registerMigrateMakeCommand method.
     * @returns {any}
     */
    public registerMigrateMakeCommand() {
        this.$app.singleton('command.migrate.make', function ($app) {

            return new MigrateMakeCommand($app['migration.creator']);
        });
    }

    /**
     * registerMigrateResetCommand method.
     * @returns {any}
     */
    public registerMigrateResetCommand() {
        this.$app.singleton('command.migrate.reset', function ($app) {
            return new ResetCommand($app['migrator']);
        });
    }

    /**
     * registerMigrateRollbackCommand method.
     * @returns {any}
     */
    public registerMigrateRollbackCommand() {
        this.$app.singleton('command.migrate.rollback', function ($app) {
            return new RollbackCommand($app['migrator']);
        });
    }

    /**
     * registerMigrateStatusCommand method.
     * @returns {any}
     */
    public registerMigrateStatusCommand() {
        this.$app.singleton('command.migrate.status', function ($app) {
            return new StatusCommand($app['migrator']);
        });
    }

    /**
     * provides method.
     * @returns {any}
     */
    public provides() {
        return [].concat(Object.values(this.$commands));
    }
}

export default MigrationServiceProvider;