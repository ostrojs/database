const Command = require('@ostro/console/command')
class WipeCommand extends Command {

    $signature = 'db:wipe';

    $description = 'Drop all tables, views, and types';

    $options = [
        this.createOption('--database', 'The database connection to use'),
        this.createOption('--drop-views', 'Drop all tables and views'),
        this.createOption('--drop-types', 'Drop all tables and types (Postgres only)'),
        this.createOption('--force', 'Force the operation to run when in production'),
    ];

    async handle() {
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

    dropAllTables($database) {
        return this.$app.db.connection($database)
            .schema()
            .dropAllTables(this.$app.db.connection($database));
    }

    dropAllViews($database) {
        return this.$app.db.connection($database)
            .schema()
            .dropAllViews(this.$app.db.connection($database));
    }

    dropAllTypes($database) {
        return this.$app.db.connection($database)
            .schema()
            .dropAllTypes(this.$app.db.connection($database));
    }

}

module.exports = WipeCommand
