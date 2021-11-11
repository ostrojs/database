const GeneratorCommand = require('@ostro/console/generatorCommand')
const path = require('path')
class MakeSeederCommand extends GeneratorCommand {

    get $signature() {
        return 'make:seeder';
    }

    get $description() {
        return 'Create a new seeder class'
    };

    get $arguments() {
        return [
            this.createArgument('<name>', 'Class name for seed').required()
        ]
    }

    get $type() {
        return 'Seeder';
    }

    getStub() {
        return this.resolveStubPath('/stubs/seeder.stub');
    }

    resolveStubPath($stub) {
        let $customPath = this.$app.basePath(trim($stub, '/'))
        return this.$file.exists($customPath).then($exists => ($exists ? $customPath : path.join(__dirname, $stub)))
    }

    async getPath($name) {
        if (await isDirectory(this.$app.databasePath('/seeds'))) {
            return this.$app.databasePath('seeds/' + this.getFileName($name).camelCase() + '.js');
        } else {
            return this.$app.databasePath('seeders/' + this.getFileName($name).camelCase() + '.js');
        }
    }

    qualifyClass($name) {
        return $name;
    }
}

module.exports = MakeSeederCommand