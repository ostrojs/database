class CanBeOneOfMany {

    $isOneOfMany = false;

    getRelationQuery() {
        return this.$query
        return this.isOneOfMany() ?
            this.$oneOfManySubQuery :
            this.$query;
    }

    getOneOfManySubQuery() {
        return this.$oneOfManySubQuery;
    }

    qualifySubSelectColumn($column) {
        return this.getRelationName() + '.' + last($column.split('.'));
    }

    qualifyRelatedColumn($column) {
        return String.contains($column, '.') ? $column : this.$query.getModel().getTable() + '.' + $column;
    }

    isOneOfMany() {
        return this.$isOneOfMany;
    }

    getRelationName() {
        return this.$relationName;
    }
}

module.exports = CanBeOneOfMany