const Command = require('@ostro/console/command')

class DumpCommand extends Command {

    $signature = 'schema:dump';

    $description = 'Dump the given database schema';

    $options = [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--path', 'The path where the schema dump file should be stored'),
        this.createOption('--prune [prune]', 'Delete all existing migration files'),
    ];

    constructor($connection, $file) {
        super()
        this.$connection = $connection
        this.$file = $file
    }

    async handle() {
        let $database = this.input.getOption('database')
        let $connection = this.$connection.connection($database);
        let $path = this.path($connection)
        await this.schemaState($connection).dump(
            $connection, $path
        );

        this.info('Database schema dumped successfully.');

        if (this.option('prune')) {
            await this.$file.deleteDirectory(
                database_path('migrations'), false
            );

            this.info('Migrations pruned successfully.');
        }
    }

    schemaState($connection) {
        return $connection.getSchemaState()
            .withMigrationTable($connection.getTablePrefix() + config.get('database.migrations', 'migrations'))
            .handleOutputUsing(function ($type, $buffer) {
                this.output.write($buffer);
            });
    }

    path($connection) {
        return tap(this.option('path') || database_path('schema/' + $connection.getName() + '-schema.dump'), async ($path) => {
            await this.$file.ensureDirectoryExists(dirname($path));
        });
    }
}

module.exports = DumpCommand