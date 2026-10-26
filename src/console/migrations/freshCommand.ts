import Command from '@ostro/console/command';

/**
 * Class FreshCommand.
 */
class FreshCommand extends Command {
    [key: string]: any;

    public get $signature(): string {
        return 'migrate:fresh';
    }

    public get $description(): string {
        return 'Drop all tables and re-run all migrations';
    }

    public get $options(): any[] {
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
        ];
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

        let $database = this.input.getOption('database');

        await this.callCommand('db:wipe', (Object as any).filter({
            '--database': $database,
            '--drop-views': this.option('drop-views'),
            '--drop-types': this.option('drop-types'),
            '--force': true,
        }));

        await this.callCommand('migrate', (Object as any).filter({
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

    /**
     * needsSeeding method.
     * @returns {any}
     */
    public needsSeeding() {
        return this.option('seed') || this.option('seeder');
    }

    /**
     * runSeeder method.
     * @param {*} $database
     * @returns {any}
     */
    public runSeeder($database: any) {
        return this.callCommand('db:seed', (Object as any).filter({
            '--database': $database,
            '--class': this.option('seeder') || 'database/seeders/databaseSeeder',
            '--force': true,
        }));
    }

}

export default FreshCommand;