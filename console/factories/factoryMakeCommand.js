const GeneratorCommand = require('@ostro/console/generatorCommand')

class FactoryMakeCommand extends GeneratorCommand {

    get $signature() {
        return 'make:factory';
    }

    get $description() {
        return 'Create a new model factory'
    };

    get $options() {
        return [
            this.createOption('-m, --model [model]', 'The name of the model'),
            this.createOption('--force', 'Force the operation to run when in production'),
        ]
    }

    get $type() {
        return 'Factory';
    }

    getStub() {
        return this.resolveStubPath('/stubs/factory.stub');
    }

    resolveStubPath($stub) {
        let $customPath = this.$app.basePath(trim($stub, '/'))
        return this.$file.exists($customPath).then($exists => ($exists ? $customPath : path.join(__dirname, $stub)))
    }

    async buildClass($name) {
        let $factory = $name.replace('Factory', '');
        $factory = this.getFileName($factory)
        let $namespaceModel = this.option('model') ?
            await this.qualifyModel(this.option('model')) :
            await this.qualifyModel(await this.guessModelName($name));

        let $model = class_basename($namespaceModel);

        $namespaceModel = '~/' + $namespaceModel.replace(this.rootNamespace(), '').slice(1).replace(/\\/gi, '/')
        let $replace = {
            'NamespacedDummyModel': $namespaceModel,
            '{{ namespacedModel }}': $namespaceModel,
            '{{namespacedModel}}': $namespaceModel,
            'DummyModel': $model.pascal(),
            '{{ model }}': $model.pascal(),
            '{{model}}': $model.pascal(),
            '{{ factory }}': $factory.pascal(),
            '{{factory}}': $factory.pascal(),
        }

        return super.buildClass($name).then(content => content.replaceAllArray(Object.keys($replace), Object.values($replace)))
    }

    async getPath($name) {
        $name = $name.finish('Factory').toString();

        return this.$app.databasePath('factories/' + this.getFileName($name).camelCase() + '.js');

    }

    async guessModelName($name) {
        if (String.endsWith($name, 'Factory')) {
            $name = $name.substr(0, -7);
        }
        let $modelName = await this.qualifyModel($name);

        if ($modelName) {
            return $modelName;
        }

        if (is_dir(app_path('models/'))) {
            return this.rootNamespace('models/model');
        }

        return path.join(this.rootNamespace('model'));
    }

}

module.exports = FactoryMakeCommand