const Command = require('@ostro/console/command')
class InstallCommand extends Command {

    $signature = 'migrate:install';

    $description = 'Create the migration repository';

    $options = [
        this.createOption('--database [database]', 'The database connection to use'),
    ];

    constructor($repository) {
        super()

        this.$repository = $repository;
    }

    handle() {
        this.$repository.setSource(this.input.getOption('database'));

        return this.$repository.createRepository().then(res => {
            this.info('Migration table created successfully.');
        })

    }

}

module.exports = InstallCommand