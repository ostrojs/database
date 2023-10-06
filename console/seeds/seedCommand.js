const Command = require('@ostro/console/command')
const path = require('path')
const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException')
class SeedCommand extends Command {

    constructor($resolver) {
        super()
        this.$resolver = $resolver;
    }

    $signature = 'db:seed';

    $description = 'Seed the database with records';

    $options = [
        this.createOption('--class <class>', 'Enter seeder class name').default('database/seeders/databaseSeeder'),
        this.createOption('--database <database>', 'The database connection to seed'),
        this.createOption('--force', 'Force the operation to run when in production')
    ];

    $arguments = [
        this.createArgument('<file>', 'Enter seeder files name')
    ];

    async handle() {
        if (!this.input.getOption('force') && !await this.confirmToProceed()) {
            return 1;
        }

        let $connection = this.$resolver.connection(this.getDatabase());

        let seeder = await this.getSeeder($connection)
        seeder.setCommand(this)

        await seeder.__invoke();

        this.info('Database seeding completed successfully.');

    }

    async getSeeder($connection) {
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

    getDatabase() {
        let $database = this.input.getOption('database');

        return $database || this.$app['config']['database.default'];
    }

}

module.exports = SeedCommand
