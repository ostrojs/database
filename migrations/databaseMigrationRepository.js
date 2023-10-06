class DatabaseMigrationRepository {
    $resolver;
    $table;
    $connection;
    constructor($resolver, $table) {
        this.$resolver = $resolver;
        this.$table = $table;
    }

    getRan() {
        return this.table()
            .orderBy('batch', 'asc')
            .orderBy('migration', 'asc')
            .pluck('migration')
    }

    getMigrations($steps) {
        return this.table()
            .where('batch', '>=', '1')
            .orderBy('batch', 'desc')
            .orderBy('migration', 'desc')
            .take($steps)
            .get();
    }

    getLast() {
        return this.table()
            .where('batch', this.getLastBatchNumber())
            .orderBy('migration', 'desc')
            .get();
    }

    getMigrationBatches() {
        return this.table()
            .orderBy('batch', 'asc')
            .orderBy('migration', 'asc')
            .pluck('batch', 'migration')
    }

    log($file, $batch) {
        return this.table().insert({ 'migration': $file, 'batch': $batch })
    }

    delete($migration) {
        return this.table().where('migration', $migration.migration).delete();
    }

    async getNextBatchNumber() {
        return ((await this.getLastBatchNumber()).batch || 0) + 1;
    }

    getLastBatchNumber() {
        return this.table().max({ batch: 'batch' });
    }

    createRepository() {
        let $schema = this.getConnection().getSchemaBuilder();

        return $schema.createTable(this.$table, function ($table) {
            $table.increments('id');
            $table.string('migration');
            $table.integer('batch');
        });
    }

    async repositoryExists() {
        let $schema = this.getConnection().getSchemaBuilder();
        return $schema.hasTable(this.$table)
    }

    deleteRepository() {
        let $schema = this.getConnection().getSchemaBuilder();

        return $schema.dropTable(this.$table);
    }

    table() {
        return this.getConnection().table(this.$table);
    }

    getConnectionResolver() {
        return this.$resolver;
    }

    getConnection() {
        return this.getConnectionResolver().connection(this.$connection);
    }

    setSource($name) {
        this.$connection = $name;
    }
}

module.exports = DatabaseMigrationRepository
