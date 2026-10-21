import Command from '@ostro/console/command';
import path from 'path';
import InvalidArgumentException from '@ostro/support/exceptions/invalidArgumentException';
import { is_file } from '@ostro/support/function';
/**
 * Class SeedCommand.
 */
class SeedCommand extends Command {
    [key: string]: any;

    /**
     * Create a new instance.
     * @param {*} $resolver
     */
    constructor($resolver: any) {
        super()
        this.$resolver = $resolver;
    }

    public get $signature(): string {
        return 'db:seed';
    }

    public get $description(): string {
        return 'Seed the database with records';
    }

    public get $options(): any[] {
        return [
        this.createOption('--class <class>', 'Enter seeder class name').default('database/seeders/databaseSeeder'),
        this.createOption('--database <database>', 'The database connection to seed'),
        this.createOption('--force', 'Force the operation to run when in production')
    ];
    }

    public get $arguments(): any[] {
        return [
        this.createArgument('<file>', 'Enter seeder files name')
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

        let $connection = this.$resolver.connection(this.getDatabase());

        let seeder = await this.getSeeder($connection)
        seeder.setCommand(this)

        await seeder.__invoke();

        this.info('Database seeding completed successfully.');

    }

    /**
     * getSeeder method.
     * @async
     * @param {*} $connection
     * @returns {any}
     */
    public async getSeeder($connection: any) {
        let $class = this.input.getArgument('file') || this.input.getOption('class');

        if ($class.includes('/') === false) {
            $class = path.resolve('database/seeders/', $class);
        }
        if ($class === 'database/seeders/databaseSeeder' && await is_file($class)) {
            $class = 'databaseSeeder';
        }
        if (!$class) {
            throw new InvalidArgumentException('Seeder File is require')
        }
        return this.$app.make(this.$app.basePath($class), [$connection])

    }

    /**
     * getDatabase method.
     * @returns {any}
     */
    public getDatabase() {
        let $database = this.input.getOption('database');

        return $database || this.$app['config']['database.default'];
    }

}

export default SeedCommand;
