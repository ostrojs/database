import { trim, isDirectory } from '@ostro/support/function';
import { camelCase } from '@ostro/support/string';
import GeneratorCommand from '@ostro/console/generatorCommand';
import path from 'path';
/**
 * Class MakeSeederCommand.
 */
class MakeSeederCommand extends GeneratorCommand {
    [key: string]: any;

    public get $signature(): string {
        return 'make:seeder';
    }

    public get $description(): string {
        return 'Create a new seeder class';
    }

    public get $arguments(): any[] {
        return [
        this.createArgument('<name>', 'Class name for seed').required()
    ];
    }

    $type = 'Seeder';

    /**
     * getStub method.
     * @returns {any}
     */
    public getStub() {
        return this.resolveStubPath('/stubs/seeder.stub');
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
     * getPath method.
     * @async
     * @param {*} $name
     * @returns {any}
     */
    public async getPath($name: string) {
        let ext = this.isTypeScript() ? '.ts' : '.js';
        let fileName = camelCase(this.getFileName($name));
        if (await isDirectory(this.$app.databasePath('/seeds'))) {
            return this.$app.databasePath('seeds/' + fileName + ext);
        } else {
            return this.$app.databasePath('seeders/' + fileName + ext);
        }
    }

    /**
     * qualifyClass method.
     * @param {*} $name
     * @returns {any}
     */
    public qualifyClass($name: string) {
        return $name;
    }
}

export default MakeSeederCommand;