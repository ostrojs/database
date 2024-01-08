const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException')

class MigrationCreator {

    $postCreate = [];

    constructor($files) {
        this.$files = $files;
    }

    async create($name, $path, $table = null, $create = false) {
        await this.ensureMigrationDoesntAlreadyExist($name, $path);

        let $stub = await this.getStub($table, $create);

        $path = this.getPath($name, $path);

        await this.$files.ensureDirectoryExists(dirname($path));

        await this.$files.put(
            $path,
            await this.populateStub($name, $stub, $table)
        );

        this.firePostCreateHooks($table);

        return $path;
    }

    async ensureMigrationDoesntAlreadyExist($name, $migrationPath = null) {
        let classes = []
        if (await this.$files.exists($migrationPath)) {
            let $migrationFiles = await this.$files.glob(path.join($migrationPath, '/*.js'));

            for (let $migrationFile of $migrationFiles) {
                classes.push(await this.$files.requireOnce($migrationFile).then(res => res.name));
            }
        }
        let $className = this.getClassName($name)
        if (classes.indexOf($className) > -1) {
            throw new InvalidArgumentException(`Unable to create migration. A ${$className} class already exists.`);
        }
    }

    async getStub($table, $create) {
        let $stub = ''
        if ($table == null) {
            let $customPath = path.join(__dirname, '/migration')
            $stub = await this.$files.exists($customPath) ?
                $customPath :
                this.stub('/migration.stub');
        } else if ($create) {
            let $customPath = path.join(__dirname, '/migration.create.stub')
            $stub = await this.$files.exists() ?
                $customPath :
                this.stub('/migration.create.stub');
        } else {
            let $customPath = path.join(__dirname, '/migration.update.stub')
            $stub = await this.$files.exists() ?
                $customPath :
                this.stub('/migration.update.stub');
        }

        return this.$files.get($stub);
    }

    populateStub($name, $stub, $table) {
        $name = this.getClassName($name)
        $stub = $stub.replaceAll('DummyClass', $name).replaceAll('{{ class }}', $name).replaceAll('{{class}}', $name)

        if ($table != null) {
            $stub = $stub.replaceAll('DummyTable', $table).replaceAll('{{ table }}', $table).replaceAll('{{table}}', $table)
        }

        return $stub;
    }

    getClassName($name) {
        return String.pascal($name);
    }

    getPath($name, $path) {
        return path.join($path, (this.getDatePrefix() + '_' + $name + '.js'));
    }

    firePostCreateHooks($table) {
        for (let $callback of this.$postCreate) {
            $callback($table);
        }
    }

    afterCreate($callback) {
        this.$postCreate.push($callback);
    }

    getDatePrefix() {
        return date('yyyy_MM_dd_hhmmss');
    }

    stub($stub) {
        return path.join(__dirname, 'stubs', $stub);
    }

    getFilesystem() {
        return this.$files;
    }
}

module.exports = MigrationCreator