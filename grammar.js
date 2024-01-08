class Grammar {

    $connection;

    $tablePrefix = '';

    getDateFormat() {
        return 'Y-m-d H:i:s';
    }

    getTablePrefix() {
        return this.$tablePrefix;
    }

    setTablePrefix($prefix) {
        this.$tablePrefix = $prefix;

        return this;
    }

    setConnection($connection) {
        this.$connection = $connection;

        return this;
    }

}

module.exports = Grammar;