/**
 * Class Migration.
 */
class Migration {
    public $connection: string | null = null;

    /**
     * getConnection method.
     * @returns {any}
     */
    public getConnection(): string | null {
        return this.$connection;
    }

    /**
     * up method.
     * @returns {any}
     */
    public up(): any {

    }

    /**
     * down method.
     * @returns {any}
     */
    public down(): any {

    }
}

export default Migration;