const { count } = require("@ostro/support/helpers");
import BaseCommand from './baseCommand';
/**
 * Class StatusCommand.
 */
class StatusCommand extends BaseCommand {
    [key: string]: any;

    public get $signature(): string {
        return 'migrate:status';
    }

    public get $description(): string {
        return 'Show the status of each migration';
    }

    public get $options(): any[] {
        return [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--path', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
    ];
    }

    /**
     * Create a new instance.
     * @param {*} $migrator
     */
    constructor($migrator: any) {
        super()

        this.$migrator = $migrator;
    }

    /**
     * handle method.
     * @returns {any}
     */
    public handle() {
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

    /**
     * getStatusFor method.
     * @async
     * @param {*} $ran
     * @param {*} $batches
     * @returns {any}
     */
    public async getStatusFor($ran: any, $batches: any) {
        return (await this.getAllMigrationFiles())
            .map(($migration) => {
                let $migrationName = this.$migrator.getMigrationName($migration);
                return $ran.indexOf($migrationName) >= 0 ? ['<info>Yes</info>', $migrationName, $batches[$migrationName]] : ['<fg=red>No</fg=red>', $migrationName];
            });
    }

    /**
     * getAllMigrationFiles method.
     * @returns {any}
     */
    public getAllMigrationFiles() {
        return this.$migrator.getMigrationFiles(this.getMigrationPaths());
    }

}

export default StatusCommand;
