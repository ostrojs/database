const BaseCommand = require('./baseCommand')
const TableGuesser = require('./tableGuesser')
const path = require('path')
const InvalidArgumentException = require('@ostro/contracts/exception/invalidArgumentException')
class CreateSchema extends BaseCommand {

    constructor($creator) {
        super()
        this.$creator = $creator;
    }

    get $signature() {
        return 'make:migration';
    }

    get $description() {
        return 'Create a new migration file'
    };

    get $options() {
        return [
            this.createOption('--database', 'The database connection to use'),
            this.createOption('--create [create]', 'The table to be created'),
            this.createOption('--table [table]', 'The table to migrate'),
            this.createOption('--path', 'The location where the migration file should be created'),
            this.createOption('--relativepath [path] ', 'The location where the migration file should be created'),
            this.createOption('--realpath', 'Indicate any provided migration file paths are pre-resolved absolute paths'),
            this.createOption('--fullpath', 'Output the full path of the migration'),
        ]
    }

    get $arguments() {
        return [
            this.createArgument('name', 'The name of the migration').required()
        ]
    }

    async handle() {

        let $name = this.input.getArgument('name');
        let $path = this.input.getOption('path')
        let $table = this.input.getOption('table');

        let $create = this.input.getOption('create') || false;

        if (!$table && String.isString($create)) {
            $table = $create;

            $create = true;
        }

        if (!$table) {
            [$table, $create] = TableGuesser.guess($name);
        }

        try {
            await this.writeMigration($name, $table, $create);
        } catch (err) {
            if (err instanceof Error) {
                this.line(err.message)
            }
        }

    }

    async writeMigration($name, $table, $create) {
        let $file = await this.$creator.create(
            $name.plural().camelCase().snakeCase(), this.getMigrationPath(), $table, $create
        );

        if (!this.option('fullpath')) {

        }

        this.line(`<info>Created Migration:</info> ${$file.replace(this.getMigrationPath(),'').slice(1)}`);
    }

    getMigrationPath() {
        let $targetPath = this.input.getOption('path')
        if ($targetPath != null) {
            return !this.usingRealPath() ? this.$app.basePath($targetPath) : $targetPath;
        }

        return super.getMigrationPath();
    }
}

module.exports = CreateSchema