const BaseCommand = require('./baseCommand')
const path = require('path')

class ResetCommand extends BaseCommand {

    $signature = 'migrate:reset';

    $description = 'Rollback all database migrations';

    $options = [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--force', 'Force the operation to run when in production'),
        this.createOption('--path', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
        this.createOption('--pretend', 'Dump the SQL queries that would be run'),
    ];

    constructor($migrator) {
        super()

        this.$migrator = $migrator;
    }

    async handle() {
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

module.exports = ResetCommand