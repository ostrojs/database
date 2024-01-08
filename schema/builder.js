const LogicException = require('@ostro/support/exceptions/logicException')
class Builder {

    $connection;

    $grammar;

    $resolver;

    $defaultStringLength = 255;

    $defaultMorphKeyType = 'int';

    $alwaysUsesNativeSchemaOperationsIfPossible = false;

    constructor($connection) {
        this.$connection = $connection;
        this.$schema = $connection.$connection.schema;
        this.$grammar = $connection.getSchemaGrammar();
    }

    create(table, cb) {
        return this.has(table).then(res => {
            if (!res)
                return this.createTable(table, cb)
        })

    }

    createTable() {
        return this.$schema.createTable(...arguments)
    }

    createTableIfNotExists() {
        return this.$schema.createTableIfNotExists(...arguments)
    }

    drop() {
        return this.$schema.dropTable(...arguments)
    }

    table() {
        return this.$schema.table(...arguments)
    }

    has() {
        return this.hasTable(...arguments)
    }

    hasTable() {
        return this.$schema.hasTable(...arguments)
    }

    alter() {
        return this.$schema.alterTable(...arguments)
    }

    raw() {
        return this.$schema.raw(...arguments)
    }

    statement() {
        return this.raw(...arguments)
    }

    dropTable() {
        return this.$schema.dropTable(...arguments)
    }

    dropSchemaIfExists() {
        return this.$schema.dropSchemaIfExists(...arguments)
    }

    dropIfExists(tableName) {
        return this.dropTableIfExists(tableName)
    }

    dropView() {
        return this.$schema.dropView(...arguments)
    }

    dropViewIfExists() {
        return this.$schema.dropViewIfExists(...arguments)
    }

    dropMaterializedView() {
        return this.$schema.dropMaterializedView(...arguments)
    }

    renameView() {
        return this.$schema.renameView(...arguments)
    }

    alterView() {
        return this.$schema.renameView(...arguments)
    }

    renameTable() {
        return this.$schema.renameTable(...arguments)
    }

    renameTable() {
        return this.$schema.renameTable(...arguments)
    }

    createView() {
        return this.$schema.createView(...arguments)
    }

    dropTableIfExists(tableName) {
        return this.$schema.dropTableIfExists(tableName)

    }

    dropSchema() {
        return this.$schema.dropSchema(...arguments)

    }

    dropSchemaIfExists() {
        return this.$schema.dropSchemaIfExists(...arguments)

    }

    createDatabase() {
        throw new LogicException('This database driver does not support creating databases.');
    }

    dropDatabaseIfExists() {
        throw new LogicException('This database driver does not support dropping databases.');
    }

    getTypes() {
        throw new LogicException('This database driver does not support user-defined types.');
    }

    getAllTables() {
        throw new LogicException('This database driver does not support getting all tables.');
    }


    dropAllTables() {
        throw new LogicException('This database driver does not support dropping all tables.');
    }

    dropAllViews() {
        throw new LogicException('This database driver does not support dropping all views.');

    }

    dropAllTypes() {
        throw new LogicException('This database driver does not support dropping all types.');

    }
}
module.exports = Builder
