import Command from '@ostro/console/command';
/**
 * Class WipeCommand.
 */
class WipeCommand extends Command {
    [key: string]: any;

    public get $signature(): string {
        return 'db:wipe';
    }

    public get $description(): string {
        return 'Drop all tables, views, and types';
    }

    public get $options(): any[] {
        return [
        this.createOption('--database', 'The database connection to use'),
        this.createOption('--drop-views', 'Drop all tables and views'),
        this.createOption('--drop-types', 'Drop all tables and types (Postgres only)'),
        this.createOption('--force', 'Force the operation to run when in production'),
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

        if (this.option('drop-views')) {
            await this.dropAllViews($database);

            this.info('Dropped all views successfully.');
        }

        await this.dropAllTables($database);

        this.info('Dropped all tables successfully.');

        if (this.option('drop-types')) {
            await this.dropAllTypes($database);

            this.info('Dropped all types successfully.');
        }

        return 0;
    }

    /**
     * dropAllTables method.
     * @param {*} $database
     * @returns {any}
     */
    public dropAllTables($database: any) {
        return this.$app.db.connection($database)
            .getSchemaBuilder()
            .dropAllTables();
    }

    /**
     * dropAllViews method.
     * @param {*} $database
     * @returns {any}
     */
    public dropAllViews($database: any) {
        return this.$app.db.connection($database)
            .getSchemaBuilder()
            .dropAllViews();
    }

    /**
     * dropAllTypes method.
     * @param {*} $database
     * @returns {any}
     */
    public dropAllTypes($database: any) {
        return this.$app.db.connection($database)
            .getSchemaBuilder()
            .dropAllTypes();
    }

}

export default WipeCommand;
