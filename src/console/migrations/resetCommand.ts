import BaseCommand from './baseCommand';
import path from 'path';

/**
 * Class ResetCommand.
 */
class ResetCommand extends BaseCommand {
    [key: string]: any;

    public get $signature(): string {
        return 'migrate:reset';
    }

    public get $description(): string {
        return 'Rollback all database migrations';
    }

    public get $options(): any[] {
        return [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--force', 'Force the operation to run when in production'),
        this.createOption('--path', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
        this.createOption('--pretend', 'Dump the SQL queries that would be run'),
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
     * @async
     * @returns {any}
     */
    public async handle() {
        if (!this.input.getOption('force') && !await this.confirmToProceed()) {
            return 1;
        }

        return this.$migrator.usingConnection(this.option('database')).then(async ($connection) => {

            if (!await this.$migrator.repositoryExists()) {
                return this.comment('Migration table not found.');
            }

            await this.$migrator.setOutput(this.output).reset(
                this.getMigrationPaths(), this.option('pretend')
            );
        });
    }

}

export default ResetCommand;