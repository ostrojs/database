const GeneratorCommand = require('@ostro/console/generatorCommand')
const path = require('path')
class MakeSeederCommand extends GeneratorCommand {

    $signature = 'make:seeder';

    $description = 'Create a new seeder class';

    $arguments = [
        this.createArgument('<name>', 'Class name for seed').required()
    ];

    $type = 'Seeder';

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