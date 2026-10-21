/**
 * Class Grammar.
 */
class Grammar {
    public $connection: any;

    public $tablePrefix: string = '';

    /**
     * Get the format for database stored dates.
     *
     * @returns Date format string.
     */
    public getDateFormat(): string {
        return 'Y-m-d H:i:s';
    }

    /**
     * Get the grammar's table prefix.
     *
     * @returns Table prefix.
     */
    public getTablePrefix(): string {
        return this.$tablePrefix;
    }

    /**
     * Set the grammar's table prefix.
     *
     * @param prefix - Table prefix.
     * @returns Fluent self instance.
     */
    public setTablePrefix(prefix: string): this {
        this.$tablePrefix = prefix;

        return this;
    }

    /**
     * Set the grammar's database connection.
     *
     * @param connection - Connection instance.
     * @returns Fluent self instance.
     */
    public setConnection(connection: any): this {
        this.$connection = connection;

        return this;
    }
}

export default Grammar;