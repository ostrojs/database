const ServiceProvider = require('@ostro/support/serviceProvider');
const MigrateCommand = require('./console/migrations/migrateCommand')
const MigrateMakeCommand = require('./console/migrations/migrationMakeCommand')
const Migrator = require('./migrations/migrator')
const MigrationCreator = require('./migrations/migrationCreator')
const InstallCommand = require('./console/migrations/installCommand')
const FreshCommand = require('./console/migrations/freshCommand')
const RefreshCommand = require('./console/migrations/refreshCommand')
const ResetCommand = require('./console/migrations/resetCommand')
const RollbackCommand = require('./console/migrations/rollbackCommand')
const StatusCommand = require('./console/migrations/statusCommand')
const DatabaseMigrationRepository = require('./migrations/databaseMigrationRepository')
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

    register() {
        this.registerRepository();

        this.registerMigrator();

        this.registerCreator();

        this.registerCommands(this.$commands);
    }

    registerRepository() {
        this.$app.singleton('migration.repository', function ($app) {
            let $table = $app['config']['database.migrations'];

            return new DatabaseMigrationRepository($app['db'], $table);
        });
    }

    registerMigrator() {
        this.$app.singleton('migrator', function ($app) {
            let $repository = $app['migration.repository'];
            return new Migrator($repository, $app['db'], $app['files']);
        });
    }

    registerCreator() {
        this.$app.singleton('migration.creator', function ($app) {
            return new MigrationCreator($app['files'], $app.basePath('stubs'));
        });
    }

    registerCommands($commands = {}) {
        for (let $command of Object.keys($commands)) {
            this[`register${$command}Command`]();
        }

        this.commands(Object.values($commands));
    }

    registerMigrateCommand() {
        this.$app.singleton('command.migrate', function ($app) {
            return new MigrateCommand($app['migrator'], $app['files']);
        });
    }

    registerMigrateFreshCommand() {
        this.$app.singleton('command.migrate.fresh', function () {
            return new FreshCommand();
        });
    }

    registerMigrateRefreshCommand() {
        this.$app.singleton('command.migrate.refresh', function () {
            return new RefreshCommand();
        });
    }

    registerMigrateInstallCommand() {
        this.$app.singleton('command.migrate.install', function ($app) {
            return new InstallCommand($app['migration.repository']);
        });
    }

    registerMigrateMakeCommand() {
        this.$app.singleton('command.migrate.make', function ($app) {

            return new MigrateMakeCommand($app['migration.creator']);
        });
    }

    registerMigrateResetCommand() {
        this.$app.singleton('command.migrate.reset', function ($app) {
            return new ResetCommand($app['migrator']);
        });
    }

    registerMigrateRollbackCommand() {
        this.$app.singleton('command.migrate.rollback', function ($app) {
            return new RollbackCommand($app['migrator']);
        });
    }

    registerMigrateStatusCommand() {
        this.$app.singleton('command.migrate.status', function ($app) {
            return new StatusCommand($app['migrator']);
        });
    }

    provides() {
        return [].concat(Object.values(this.$commands));
    }
}

module.exports = MigrationServiceProvider