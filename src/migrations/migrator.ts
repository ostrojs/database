import Collection from '@ostro/support/collection';
import { count, collect, get_class_name } from '@ostro/support/function';
import fs from 'fs-extra';
import path from 'path';

/**
 * Class Migrator.
 */
class Migrator {

    public $paths = [];

    public $output = null;

    public $repository: any;
    public $resolver: any;
    public $file: any;
    public connection: any;

    /**
     * Create a new instance.
     * @param {*} $repository
     * @param {*} $resolver
     * @param {*} $file
     */
    constructor($repository: any, $resolver: any, $file: any) {

        this.$repository = $repository;
        this.$resolver = $resolver;
        this.$file = $file;

    }

    /**
     * run method.
     * @param {*} $paths
     * @param {*} $options
     * @returns {any}
     */
    public run($paths: any[] = [], $options: any[] = []) {

        return this.getMigrationFiles($paths).then($files => {

            return this.$repository.getRan().then(async (res) => {
                let $migrations = await this.pendingMigrations($files, res)
                return this.runPending($migrations, $options)
            })

        })

    }

    /**
     * pendingMigrations method.
     * @param {*} $files
     * @param {*} $ran
     * @returns {any}
     */
    public pendingMigrations($files: any, $ran: any) {

        return Collection.make($files)
            .differenceWith($ran, (file, compare) => {
                return this.getMigrationName(file) == compare
            }).values().all();
    }

    /**
     * runPending method.
     * @async
     * @param {*} $migrations
     * @param {*} $options
     * @returns {any}
     */
    public async runPending($migrations: any, $options: any[] = []) {

        if ($migrations.length === 0) {

            this.note('<info>Nothing to migrate.</info>');

            return;
        }

        let $batch = await this.$repository.getNextBatchNumber();

        let $pretend = $options['pretend'] ? $options['pretend'] : false;

        let $step = $options['step'] ? $options['step'] : false;
        for (let $file of $migrations) {

            await this.runUp($file, $batch, $pretend);
            if ($step) {
                $batch++;
            }
        }

    }

    /**
     * runUp method.
     * @async
     * @param {*} $file
     * @param {*} $batch
     * @param {*} $pretend
     * @returns {any}
     */
    public async runUp($file: any, $batch: any, $pretend: any) {

        let $migration = this.resolvePath($file);

        let $name = this.getMigrationName($file);

        if ($pretend) {
            return await this.pretendToRun($migration, 'up');
        }
        this.note(`<comment>Migrating:</comment> ${$name}`);

        let $startTime = Date.now();

        await this.runMigration($migration, 'up');

        let $runTime = Number((Date.now() - $startTime));

        await this.$repository.log($name, $batch);

        this.note(`<info>Migrated:</info>  ${$name} (${$runTime}ms)`);
    }

    /**
     * rollback method.
     * @async
     * @param {*} $paths
     * @param {*} $options
     * @returns {any}
     */
    public async rollback($paths: any[] = [], $options: any[] = []) {

        let $migrations = await this.getMigrationsForRollback($options);
        if ($migrations.length === 0) {

            this.note('<info>Nothing to rollback.</info>');

            return [];
        }

        return this.rollbackMigrations($migrations, $paths, $options);
    }

    /**
     * getMigrationsForRollback method.
     * @async
     * @param {*} $options
     * @returns {any}
     */
    public async getMigrationsForRollback($options: any[] = []) {
        let $steps = $options['step'] ? $options['step'] : 0
        if ($steps > 0) {
            return await this.$repository.getMigrations($steps);
        }

        return this.$repository.getLast();
    }

    /**
     * rollbackMigrations method.
     * @async
     * @param {*} $migrations
     * @param {*} $paths
     * @param {*} $options
     * @returns {any}
     */
    public async rollbackMigrations($migrations: any, $paths: any, $options: Record<string, any>) {
        let $rolledBack = [];
        let $files = await this.getMigrationFiles($paths)

        for (let $migration of $migrations) {

            let $file = $files.find((content) => this.getMigrationName(content) == $migration.migration)
            if (!$file) {
                this.note(`<fg=red>Migration not found:</> ${$migration.migration}`);

                continue;
            }

            $rolledBack.push($file);

            await this.runDown(
                $file, $migration,
                $options['pretend'] ? $options['pretend'] : false
            );
        }

        return $rolledBack;
    }

    /**
     * reset method.
     * @async
     * @param {*} $paths
     * @param {*} $pretend
     * @returns {any}
     */
    public async reset($paths: any[] = [], $pretend: boolean = false) {

        let $migrations = (await this.$repository.getRan()).reverse();
        if (count($migrations) === 0) {
            this.note('<info>Nothing to rollback.</info>');

            return [];
        }

        return this.resetMigrations($migrations, $paths, $pretend);
    }

    /**
     * resetMigrations method.
     * @async
     * @param {*} $migrations
     * @param {*} $paths
     * @param {*} $pretend
     * @returns {any}
     */
    public async resetMigrations($migrations: any, $paths: any, $pretend: boolean = false) {

        $migrations = collect($migrations).map(function ($m) {
            return {
                'migration': $m
            };
        }).all();

        return await this.rollbackMigrations(
            $migrations, $paths, { $pretend }
        );
    }

    /**
     * runDown method.
     * @async
     * @param {*} $file
     * @param {*} $migration
     * @param {*} $pretend
     * @returns {any}
     */
    public async runDown($file: any, $migration: any, $pretend: any) {

        let $instance = this.resolvePath($file);

        this.note(`<comment>Rolling back:</comment> ${$migration.migration}`);

        if ($pretend) {
            return await this.pretendToRun($instance, 'down');
        }

        let $startTime = Date.now();

        await this.runMigration($instance, 'down');

        let $runTime = Number((Date.now() - $startTime));

        await this.$repository.delete($migration);

        this.note(`<info>Rolled back:</info>  ${$migration.migration} (${$runTime}ms)`);
    }

    /**
     * runMigration method.
     * @async
     * @param {*} $migration
     * @param {*} $method
     * @returns {any}
     */
    public async runMigration($migration: any, $method: string) {
        let $connection = this.resolveConnection(typeof $migration.getConnection === 'function' ? $migration.getConnection() : null);
        if (typeof $migration[$method] == 'function') {
            await $migration[$method]($connection ? $connection.getSchemaBuilder() : null, $connection);
        }

    }

    /**
     * pretendToRun method.
     * @async
     * @param {*} $migration
     * @param {*} $method
     * @returns {any}
     */
    public async pretendToRun($migration: any, $method: string) {
        try {
            let $queries = await this.getQueries($migration, $method);
            for (let $query of $queries) {
                let $name = get_class_name($migration);

                this.note(`<info>${$name}:</info> ${$query['query']}`);
            }
        } catch ($e) {
            let $name = get_class_name($migration);

            this.note(`<info>${$name}:</info> failed to dump queries. This may be due to changing database columns using Doctrine, which is not supported while pretending to run migrations.`);
        }
    }

    /**
     * getQueries method.
     * @param {*} $migration
     * @param {*} $method
     * @returns {any}
     */
    public getQueries($migration: any, $method: string) {
        let $db = this.resolveConnection(
            $migration.getConnection()
        );

        return $db.pretend(function () {
            if (typeof $migration[$method] === 'function') {
                $migration[$method]();
            }
        });
    }

    /**
     * resolve method.
     * @param {*} $file
     * @returns {any}
     */
    public resolve($file: any) {
        let $class = this.getMigrationClass($file);

        return typeof $class === 'function' ? new ($class as any)() : $class;
    }

    /**
     * resolvePath method.
     * @param {*} $path
     * @returns {any}
     */
    public resolvePath($path: string) {
        const resolved = require.resolve($path);
        delete require.cache[resolved];

        let $mod = require($path);
        let $migration = $mod.default || $mod;
        $migration = $migration.default || $migration;

        return typeof $migration == 'object' ? $migration : new $migration;
    }

    /**
     * getMigrationClass method.
     * @param {*} $migrationName
     * @returns {any}
     */
    public getMigrationClass($migrationName: any) {

    }

    /**
     * getMigrationFiles method.
     * @async
     * @param {*} $paths
     * @returns {any}
     */
    public async getMigrationFiles($paths: any) {
        let datas = Collection.make($paths).flatMap(async ($path) => {
            return ($path.endsWith('.js') || $path.endsWith('.ts')) ? [$path] : this.$file.glob($path + path.sep + '*_*.[jt]s')
        }).all()
        return Promise.all(datas).then(files => {
            return Collection.make(files).filter(Boolean).values().flatten().sortBy(($file, $key) => {
                return $key;
            }).all()
        })

    }

    /**
     * requireFiles method.
     * @param {*} $files
     * @returns {any}
     */
    public requireFiles($files: any[] = []) {
        for (var i = 0; i < $files.length; i++) {
            $files[i] = fs.readFile($files[i]).then(res => res.toString());
        }
        return Promise.allSettled($files)

    }

    /**
     * getMigrationName method.
     * @param {*} $path
     * @returns {any}
     */
    public getMigrationName($path: string = '') {

        return path.basename($path)

    }

    /**
     * paths method.
     * @returns {any}
     */
    public paths() {
        return this.$paths;
    }

    /**
     * getConnection method.
     * @returns {any}
     */
    public getConnection() {
        return this.connection;
    }

    /**
     * usingConnection method.
     * @param {*} $name
     * @returns {any}
     */
    public usingConnection($name: string) {
        return Promise.resolve(this.resolveConnection($name))

    }

    /**
     * setConnection method.
     * @param {*} $name
     * @returns {any}
     */
    public setConnection($name: string) {
        this.connection = $name;
    }

    /**
     * resolveConnection method.
     * @param {*} $connection
     * @returns {any}
     */
    public resolveConnection($connection: any) {
        return this.$resolver.connection($connection || this.connection);
    }

    /**
     * getRepository method.
     * @returns {any}
     */
    public getRepository() {
        return this.$repository;
    }

    /**
     * repositoryExists method.
     * @returns {any}
     */
    public repositoryExists() {
        return this.$repository.repositoryExists();
    }

    /**
     * hasRunAnyMigrations method.
     * @returns {any}
     */
    public hasRunAnyMigrations() {
        return this.repositoryExists().then(res => {
            if (res == true) {
                return this.$repository.getRan()
            }
        })
    }

    /**
     * deleteRepository method.
     * @returns {any}
     */
    public deleteRepository() {
        return this.$repository.deleteRepository();
    }

    /**
     * getFilesystem method.
     * @returns {any}
     */
    public getFilesystem() {
        return this.$file;
    }

    /**
     * setOutput method.
     * @param {*} $output
     * @returns {any}
     */
    public setOutput($output: any) {
        this.$output = $output;
        return this;
    }

    /**
     * note method.
     * @param {*} $message
     * @returns {any}
     */
    public note($message: string) {
        if (this.$output) {
            this.$output.writeln($message);
        }
    }

}

export default Migrator;
