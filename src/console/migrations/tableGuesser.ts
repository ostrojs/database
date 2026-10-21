/**
 * Class TableGuesser.
 */
class TableGuesser {
    /**
     * Get CREATE_PATTERNS.
     * @static
     * @returns {any}
     */
    static get CREATE_PATTERNS() {
        return [
            /^create_(\w+)_table/,
            /^create_(\w+)/,
        ]
    }

    /**
     * Get CHANGE_PATTERNS.
     * @static
     * @returns {any}
     */
    static get CHANGE_PATTERNS() {

        return [
            /_(to|from|in)_(\w+)_table/,
            /_(to|from|in)_(\w+)/,
        ]
    }

    /**
     * guess method.
     * @static
     * @param {*} $migration
     * @returns {any}
     */
    static guess($migration: any) {
        for (let $pattern of this.CREATE_PATTERNS) {
            let $matches = $migration.match($pattern)
            if ($matches) {
                return [$matches[1], true];
            }
            return []
        }

        for (let $pattern of this.CHANGE_PATTERNS) {
            let $matches = $migration.match($pattern)
            if ($matches) {
                return [$matches[2], false];
            }
            return []
        }
    }
}

export default TableGuesser;