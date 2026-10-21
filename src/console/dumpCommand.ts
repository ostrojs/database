declare var database_path: any, config: any, is_dir: any, app_path: any, isDirectory: any;
const { dirname } = require("path");
const { tap } = require("@ostro/support/helpers");
import Command from '@ostro/console/command';

/**
 * Class DumpCommand.
 */
class DumpCommand extends Command {
    [key: string]: any;

    public get $signature(): string {
        return 'schema:dump';
    }

    public get $description(): string {
        return 'Dump the given database schema';
    }

    public get $options(): any[] {
        return [
        this.createOption('--database [database]', 'The database connection to use'),
        this.createOption('--path', 'The path where the schema dump file should be stored'),
        this.createOption('--prune [prune]', 'Delete all existing migration files'),
    ];
    }

    /**
     * Create a new instance.
     * @param {*} $connection
     * @param {*} $file
     */
    constructor($connection: any, $file: any) {
        super()
        this.$connection = $connection
        this.$file = $file
    }

    /**
     * handle method.
     * @async
     * @returns {any}
     */
    public async handle() {
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

    /**
     * schemaState method.
     * @param {*} $connection
     * @returns {any}
     */
    public schemaState($connection: any) {
        return $connection.getSchemaState()
            .withMigrationTable($connection.getTablePrefix() + config.get('database.migrations', 'migrations'))
            .handleOutputUsing(function ($type, $buffer) {
                this.output.write($buffer);
            });
    }

    /**
     * path method.
     * @param {*} $connection
     * @returns {any}
     */
    public path($connection: any) {
        return tap(this.option('path') || database_path('schema/' + $connection.getName() + '-schema.dump'), async ($path) => {
            await this.$file.ensureDirectoryExists(dirname($path));
        });
    }
}

export default DumpCommand;