const BaseCommand = require('./baseCommand')
class StatusCommand extends BaseCommand {

    $signature = 'migrate:status';

    $description = 'Show the status of each migration';

    $options = [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--path', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
    ];

    constructor($migrator) {
        super()

        this.$migrator = $migrator;
    }

    handle() {
        return this.$migrator.usingConnection(this.option('database')).then(async ($connection) => {
            if (!await this.$migrator.repositoryExists()) {
                this.error('Migration table not found.');
                return 1;
            }

            let $ran = await this.$migrator.getRepository().getRan();

            let $batches = await this.$migrator.getRepository().getMigrationBatches();
            let $migrations = await this.getStatusFor($ran, $batches)
            if (count($migrations) > 0) {
                this.table(['Ran?', 'Migration', 'Batch'], $migrations);
            } else {
                this.error('No migrations found');
            }
        });
    }

    async getStatusFor($ran, $batches) {
        return (await this.getAllMigrationFiles())
            .map(($migration) => {
                let $migrationName = this.$migrator.getMigrationName($migration);
                return $ran.indexOf($migrationName) >= 0 ? ['<info>Yes</info>', $migrationName, $batches[$migrationName]] : ['<fg=red>No</fg=red>', $migrationName];
            });
    }

    getAllMigrationFiles() {
        return this.$migrator.getMigrationFiles(this.getMigrationPaths());
    }

}

module.exports = StatusCommand
