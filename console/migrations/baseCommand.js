const Command = require('@ostro/console/command')

class BaseCommand extends Command {

    getMigrationPaths() {

        if (this.input.hasOption('path') && this.option('path')) {
            return collect(this.option('path').split(',')).map(($path) => {
                return !this.usingRealPath() ?
                    this.$app.basePath($path) :
                    $path;
            }).all();
        }

        return this.$migrator.paths().concat([this.getMigrationPath()])
    }

    usingRealPath() {
        return this.input.hasOption('realpath') && this.option('realpath');
    }

    getMigrationPath() {
        return this.$app.databasePath('migrations');
    }
}

module.exports = BaseCommand