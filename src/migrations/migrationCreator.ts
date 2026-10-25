import path from 'path';
import InvalidArgumentException from '@ostro/support/exceptions/invalidArgumentException';
import { dirname, date } from '@ostro/support/function';
import { pascal } from '@ostro/support/string';

/**
 * Class MigrationCreator.
 */
class MigrationCreator {

    public $postCreate = [];
    public $files: any;
    public $customStubPath: any;

    public $app: any;

    /**
     * Create a new instance.
     * @param {*} $files
     * @param {*} $customStubPath
     * @param {*} $app
     */
    constructor($files: any, $customStubPath: any = null, $app: any = null) {
        this.$files = $files;
        this.$customStubPath = $customStubPath;
        this.$app = $app;
    }

    /**
     * create method.
     * @async
     * @param {*} $name
     * @param {*} $path
     * @param {*} $table
     * @param {*} $create
     * @returns {any}
     */
    public async create($name: string, $path: string, $table: any = null, $create: boolean = false) {
        await this.ensureMigrationDoesntAlreadyExist($name, $path);

        let $stub = await this.getStub($table, $create, $path);

        $path = this.getPath($name, $path);

        await this.$files.ensureDirectoryExists(dirname($path));

        await this.$files.put(
            $path,
            await this.populateStub($name, $stub, $table)
        );

        this.firePostCreateHooks($table);

        return $path;
    }

    /**
     * ensureMigrationDoesntAlreadyExist method.
     * @async
     * @param {*} $name
     * @param {*} $migrationPath
     * @returns {any}
     */
    /**
     * Determine if the application or directory uses TypeScript.
     *
     * @param {*} $path
     * @returns {boolean}
     */
    public isTypeScript($path: string = ''): boolean {
        try {
            if (this.$app && this.$app['config']) {
                const configVal = typeof this.$app['config'].get === 'function' ?
                    this.$app['config'].get('app.typescript') :
                    this.$app['config']['app.typescript'];
                if (typeof configVal === 'boolean') {
                    return configVal;
                }
            }
            const fs = require('fs');
            if (this.$customStubPath && (this.$customStubPath.endsWith('.ts.stub') || fs.existsSync(path.join(path.dirname(this.$customStubPath), 'tsconfig.json')))) {
                return true;
            }
            if ($path) {
                let dir = path.resolve($path);
                for (let i = 0; i < 4; i++) {
                    if (fs.existsSync(path.join(dir, 'tsconfig.json')) || fs.existsSync(path.join(dir, 'tsconfig.build.json')) || fs.existsSync(path.join(dir, 'app.ts'))) {
                        return true;
                    }
                    const parent = path.dirname(dir);
                    if (parent === dir) break;
                    dir = parent;
                }
            }
        } catch { }
        return false;
    }

    /**
     * ensureMigrationDoesntAlreadyExist method.
     * @async
     * @param {*} $name
     * @param {*} $migrationPath
     * @returns {any}
     */
    public async ensureMigrationDoesntAlreadyExist($name: string, $migrationPath: any = null) {
        let classes = []
        if (await this.$files.exists($migrationPath)) {
            let $migrationFiles = await this.$files.glob(path.join($migrationPath, '/*.[jt]s'));

            for (let $migrationFile of $migrationFiles) {
                try {
                    let cls = await this.$files.requireOnce($migrationFile).then((res: any) => res.name);
                    if (cls) {
                        classes.push(cls);
                        continue;
                    }
                } catch { }
                try {
                    let content = await this.$files.get($migrationFile);
                    let match = content.match(/class\s+([A-Za-z0-9_]+)/);
                    if (match && match[1]) {
                        classes.push(match[1]);
                    }
                } catch { }
            }
        }
        let $className = this.getClassName($name)
        if (classes.indexOf($className) > -1) {
            throw new InvalidArgumentException(`Unable to create migration. A ${$className} class already exists.`);
        }
    }

    /**
     * getStub method.
     * @async
     * @param {*} $table
     * @param {*} $create
     * @param {*} $path
     * @returns {any}
     */
    public async getStub($table: string, $create: any, $path: string = '') {
        const isTs = this.isTypeScript($path);
        const ext = isTs ? '.ts.stub' : '.stub';
        let $stub = ''
        if ($table == null) {
            let $customPath = path.join(__dirname, '/migration' + ext)
            $stub = await this.$files.exists($customPath) ?
                $customPath :
                this.stub('/migration' + ext);
        } else if ($create) {
            let $customPath = path.join(__dirname, '/migration.create' + ext)
            $stub = await this.$files.exists($customPath) ?
                $customPath :
                this.stub('/migration.create' + ext);
        } else {
            let $customPath = path.join(__dirname, '/migration.update' + ext)
            $stub = await this.$files.exists($customPath) ?
                $customPath :
                this.stub('/migration.update' + ext);
        }

        return this.$files.get($stub);
    }

    /**
     * populateStub method.
     * @param {*} $name
     * @param {*} $stub
     * @param {*} $table
     * @returns {any}
     */
    public populateStub($name: string, $stub: any, $table: string) {
        $name = this.getClassName($name)
        $stub = $stub.replaceAll('DummyClass', $name).replaceAll('{{ class }}', $name).replaceAll('{{class}}', $name)

        if ($table != null) {
            $stub = $stub.replaceAll('DummyTable', $table).replaceAll('{{ table }}', $table).replaceAll('{{table}}', $table)
        }

        return $stub;
    }

    /**
     * getClassName method.
     * @param {*} $name
     * @returns {any}
     */
    public getClassName($name: string) {
        return pascal($name);
    }

    /**
     * getPath method.
     * @param {*} $name
     * @param {*} $path
     * @returns {any}
     */
    public getPath($name: string, $path: string) {
        let ext = this.isTypeScript($path) ? '.ts' : '.js';
        return path.join($path, (this.getDatePrefix() + '_' + $name + ext));
    }

    /**
     * firePostCreateHooks method.
     * @param {*} $table
     * @returns {any}
     */
    public firePostCreateHooks($table: string) {
        for (let $callback of this.$postCreate) {
            $callback($table);
        }
    }

    /**
     * afterCreate method.
     * @param {*} $callback
     * @returns {any}
     */
    public afterCreate($callback: Function) {
        this.$postCreate.push($callback);
    }

    /**
     * getDatePrefix method.
     * @returns {any}
     */
    public getDatePrefix() {
        return date('yyyy_MM_dd_hhmmss');
    }

    /**
     * stub method.
     * @param {*} $stub
     * @returns {any}
     */
    public stub($stub: any) {
        return path.join(__dirname, 'stubs', $stub);
    }

    /**
     * getFilesystem method.
     * @returns {any}
     */
    public getFilesystem() {
        return this.$files;
    }
}

export default MigrationCreator;