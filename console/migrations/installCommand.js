const Command = require('@ostro/console/command')
class InstallCommand extends Command {

    get $signature() {
        return 'migrate:install';
    }

    get $description() {
        return 'Create the migration repository'
    }

    get $options() {
        return [
            this.createOption('--database [database]', 'The database connection to use'),
        ]
    }

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