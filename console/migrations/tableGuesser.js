class TableGuesser {
    static get CREATE_PATTERNS() {
        return [
            /^create_(\w+)_table/,
            /^create_(\w+)/,
        ]
    }

    static get CHANGE_PATTERNS() {

        return [
            /_(to|from|in)_(\w+)_table/,
            /_(to|from|in)_(\w+)/,
        ]
    }

    static guess($migration) {
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

module.exports = TableGuesser