const BaseCommand = require('./baseCommand')

class RollbackCommand extends BaseCommand {

    $signature = 'migrate:rollback';

    $description = 'Rollback all database migrations';

    $options = [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--force', 'Force the operation to run when in production'),
        this.createOption('--path [path]', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath [realpath]', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
        this.createOption('--pretend', 'Dump the SQL queries that would be run'),
        this.createOption('--step [step]', 'The number of migrations to be reverted'),
    ];
    
    constructor($migrator) {
        super()

        this.$migrator = $migrator;
    }

    async handle() {
        if (!this.input.getOption('force') && !await this.confirmToProceed()) {
            return 1;
        }

        return this.$migrator.usingConnection(this.input.option('database')).then(($connection) => {

            return this.$migrator.setOutput(this.output)
                .rollback(
                    this.getMigrationPaths(), {
                        'pretend': this.option('pretend'),
                        'step': this.option('step'),
                    }
                );

        })

        return 0;
    }

}

module.exports = RollbackCommand