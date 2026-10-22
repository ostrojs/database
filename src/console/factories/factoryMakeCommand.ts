import path from "path";
import { trim, class_basename } from "@ostro/support/function";
import { endsWith } from "@ostro/support/string";
declare var is_dir: any, app_path: any;
import GeneratorCommand from '@ostro/console/generatorCommand';

/**
 * Class FactoryMakeCommand.
 */
class FactoryMakeCommand extends GeneratorCommand {
    [key: string]: any;

    public get $signature(): string {
        return 'make:factory';
    }

    public get $description(): string {
        return 'Create a new model factory';
    }

    public get $options(): any[] {
        return [
        this.createOption('-m, --model [model]', 'The name of the model'),
        this.createOption('--force', 'Force the operation to run when in production'),
    ];
    }

    $type = 'Factory';

    /**
     * getStub method.
     * @returns {any}
     */
    public getStub() {
        return this.resolveStubPath('/stubs/factory.stub');
    }

    /**
     * resolveStubPath method.
     * @param {*} $stub
     * @returns {any}
     */
    public resolveStubPath($stub: any) {
        if (this.isTypeScript()) {
            let tsStub = $stub.replace(/\.stub$/, '.ts.stub');
            let customTsPath = this.$app.basePath(trim(tsStub, '/'));
            let fallbackTsPath = path.join(__dirname, tsStub);
            return this.$file.exists(customTsPath).then(($exists: any) => {
                if ($exists) return customTsPath;
                return this.$file.exists(fallbackTsPath).then(($fallbackExists: any) => {
                    if ($fallbackExists) return fallbackTsPath;
                    let $customPath = this.$app.basePath(trim($stub, '/'));
                    return this.$file.exists($customPath).then(($e: any) => ($e ? $customPath : path.join(__dirname, $stub)));
                });
            });
        }
        let $customPath = this.$app.basePath(trim($stub, '/'))
        return this.$file.exists($customPath).then($exists => ($exists ? $customPath : path.join(__dirname, $stub)))
    }

    /**
     * buildClass method.
     * @async
     * @param {*} $name
     * @returns {any}
     */
    public async buildClass($name: string) {
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
            'DummyModel': ($model as any).pascal(),
            '{{ model }}': ($model as any).pascal(),
            '{{model}}': ($model as any).pascal(),
            '{{ factory }}': ($factory as any).pascal(),
            '{{factory}}': ($factory as any).pascal(),
        }

        return super.buildClass($name).then(content => content.replaceAllArray(Object.keys($replace), Object.values($replace)))
    }

    /**
     * getPath method.
     * @async
     * @param {*} $name
     * @returns {any}
     */
    public async getPath($name: string) {
        $name = ($name as any).finish('Factory').toString();
        let ext = this.isTypeScript() ? '.ts' : '.js';
        return this.$app.databasePath('factories/' + (this.getFileName($name) as any).camelCase() + ext);

    }

    /**
     * guessModelName method.
     * @async
     * @param {*} $name
     * @returns {any}
     */
    public async guessModelName($name: string) {
        if (endsWith($name, 'Factory')) {
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

export default FactoryMakeCommand;