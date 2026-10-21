import BaseCommand from './baseCommand';
import path from 'path';

/**
 * Class CreateMigration.
 */
class CreateMigration extends BaseCommand {
    [key: string]: any;

    /**
     * Create a new instance.
     * @param {*} migrator
     * @param {*} file
     */
    constructor(migrator: any, file: any) {
        super()
        this.$migrator = migrator;
        this.$file = file;
    }

    public get $signature(): string {
        return 'migrate';
    }

    public get $description(): string {
        return 'migrate to database';
    }

    public get $options(): any[] {
        return [
        this.createOption('--database=', 'The database connection to use'),
        this.createOption('--force', 'Force the operation to run when in production'),
        this.createOption('--path [path]', 'The path(s) to the migrations files to be executed'),
        this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
        this.createOption('--schema-path=', 'The path to a schema dump file'),
        this.createOption('--pretend', 'Dump the SQL queries that would be run'),
        this.createOption('--seed', 'Indicates if the seed task should be re-run'),
        this.createOption('--step [step]', 'Force the migrations to be run so they can be rolled back individually')
    ];
    }

    /**
     * handle method.
     * @returns {any}
     */
    public handle() {
        return this.$migrator.usingConnection(this.input.option('database')).then(($connection) => {
            return this.prepareDatabase().then(success => {
                return this.$migrator.setOutput(this.output)
                    .run(this.getMigrationPaths(), {
                        'pretend': this.input.option('pretend'),
                        'step': this.input.option('step'),
                    }).then(success => {
                        if (this.input.option('seed') && !this.input.option('pretend')) {
                            return this.callCommand('db:seed', {
                                '--force': true
                            });
                        }
                    })

            })
        })
    }

    /**
     * prepareDatabase method.
     * @returns {any}
     */
    public prepareDatabase() {
        return this.$migrator.repositoryExists().then(exists => {
            if (!exists) {
                return this.callCommand('migrate:install', (Object as any).filter({
                    '--database': this.input.option('database'),
                }));
            } else {
                return this.$migrator.hasRunAnyMigrations().then(res => {
                    if (this.input.option('pretend')) {
                        return this.loadSchemaState();
                    }
                })
            }
        })
    }

    /**
     * loadSchemaState method.
     * @returns {any}
     */
    public loadSchemaState() {
        let $connection = this.$migrator.resolveConnection(this.input.option('database'));

        return this.schemaPath($connection).then($path => {
            this.line('<info>Loading stored database schema:</info> ' + $path);
            this.$migrator.deleteRepository();

            $connection.getSchemaState().handleOutputUsing(function ($type, $buffer) {
                this.output.write($buffer);
            }).load($path);

        })

    }

    /**
     * schemaPath method.
     * @param {*} $connection
     * @returns {any}
     */
    public schemaPath($connection: any) {
        if (this.input.option('schema-path')) {
            return this.input.option('schema-path');
        }
        let $path = this.$app.databasePath('schema/' + $connection.getName() + '-schema.dump')
        return this.$file.exists($path).then(fileExists => {
            if (fileExists) {
                return $path;
            }

            return this.$app.databasePath('schema/' + $connection.getName() + '-schema.sql');
        })

    }
}

export default CreateMigration;