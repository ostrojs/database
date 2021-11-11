const Command = require('@ostro/console/command')

class FreshCommand extends Command {

    get $signature() {
        return 'migrate:fresh';
    }

    get $description() {
        return 'Drop all tables and re-run all migrations'
    }

    get $options() {

        return [
            this.createOption('--database [database]', 'The database connection to use'),
            this.createOption('--drop-views', 'Drop all tables and views'),
            this.createOption('--drop-types', 'Drop all tables and types (Postgres only)'),
            this.createOption('--force', 'Force the operation to run when in production'),
            this.createOption('--path', 'The path(s) to the migrations files to be executed'),
            this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
            this.createOption('--schema-path', 'The path to a schema dump file'),
            this.createOption('--seed', 'Indicates if the seed task should be re-run'),
            this.createOption('--seeder', 'The class name of the root seeder'),
            this.createOption('--step', 'Force the migrations to be run so they can be rolled back individually'),
        ]
    }

    async handle() {
        if (!this.input.getOption('force') && !await this.confirmToProceed()) {
            return 1;
        }

        let $database = this.input.getOption('database');

        await this.callCommand('db:wipe', Object.filter({
            '--database': $database,
            '--drop-views': this.option('drop-views'),
            '--drop-types': this.option('drop-types'),
            '--force': true,
        }));

        await this.callCommand('migrate', Object.filter({
            '--database': $database,
            '--path': this.input.getOption('path'),
            '--realpath': this.input.getOption('realpath'),
            '--schema-path': this.input.getOption('schema-path'),
            '--force': true,
            '--step': this.option('step'),
        }));

        if (this.needsSeeding()) {
            await this.runSeeder($database);
        }

        return 0;
    }

    needsSeeding() {
        return this.option('seed') || this.option('seeder');
    }

    runSeeder($database) {
        return this.callCommand('db:seed', Object.filter({
            '--database': $database,
            '--class': this.option('seeder') || 'database/seeders/databaseSeeder',
            '--force': true,
        }));
    }

}

module.exports = FreshCommand