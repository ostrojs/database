const Relation = require('../relations/relation');
const RelationNotFoundException = require('../relationNotFoundException');
const knex = require('knex');
class QueriesRelationships {

    has($relation, $operator = '>=', $count = 1, $boolean = 'and', $callback) {
        $operator = typeof $operator != 'string' ? '>=' : $operator
        $count = typeof $count != 'number' ? 1 : $count
        $boolean = typeof $boolean != 'string' ? 'and' : $boolean
        if (is_string($relation)) {
            if (strpos($relation, '.') !== false) {

                return this.hasNested($relation, $operator, $count, $boolean, $callback);

            }

            $relation = this.getRelationWithoutConstraints($relation);
        }

        let $method = this.canUseExistsForExistenceCheck($operator, $count) ?
            'getRelationExistenceQuery' :
            'getRelationExistenceCountQuery';

        let $hasQuery = $relation[$method](
            $relation.getRelated().newQueryWithoutRelationships(), this
        );

        if ($callback) {
            $callback($hasQuery);
        }

        return this.addHasWhere(
            $hasQuery, $relation, $operator, $count, $boolean
        );
    }

    hasNested($relations, $operator = '>=', $count = 1, $boolean = 'and') {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        $relations = $relations.split('.');

        let $doesntHave = $operator === '<' && $count === 1;

        if ($doesntHave) {
            $operator = '>=';
            $count = 1;
        }

        let $closure = function ($q) {

            count($relations) > 1 ?
                $q.whereHas($relations.shift(), $closure) :
                $q.has($relations.shift(), $operator, $count, 'and', $callback);
        };

        return this.has($relations.shift(), $doesntHave ? '<' : '>=', 1, $boolean, $closure);
    }

    orHas($relation, $operator = '>=', $count = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'or', $callback);
    }

    doesntHave($relation, $boolean = 'and') {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, '<', 1, $boolean, $callback);
    }

    orDoesntHave($relation, $callback) {
        return this.doesntHave($relation, 'or', $callback);
    }

    whereHas($relation, $operator = '>=', $count = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'and', $callback);
    }

    orWhereHas($relation, $operator = '>=', $count = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'or', $callback);
    }

    whereDoesntHave($relation, $callback = null) {
        return this.doesntHave($relation, 'and', $callback);
    }

    orWhereDoesntHave($relation, $callback = null) {
        return this.doesntHave($relation, 'or', $callback);
    }

    getBelongsToRelation($relation, $type) {
        $belongsTo = Relation.noConstraints(() => {
            return this.model.belongsTo(
                $type,
                $relation.getForeignKeyName(),
                $relation.getOwnerKeyName()
            );
        });

        $belongsTo.getQuery().mergeConstraintsFrom($relation.getQuery());

        return $belongsTo;
    }

    withAggregate($relations, $column, $function = null) {

        if (empty($relations)) {
            return this;
        }
        let selftColumns = this.getQuery()._statements.filter(statement => statement.grouping === 'columns')
            .flatMap(statement => statement.value);
        if (is_null(selftColumns)) {

            this.select(this.getTable() + '.*');
        }

        $relations = is_array($relations) ? $relations : [$relations];
        const parsedRelations = this.parseWithRelations($relations);

        for (let $name in parsedRelations) {
            const $constraints = parsedRelations[$name];
            let $segments = $name.split(' ');
            let $alias, $expression, $hashedColumn, $wrappedColumn;
            if (count($segments) === 3 && String.lower($segments[1]) === 'as') {
                $name = $segments[0];
                $alias = $segments[2];
            }

            let $relation = this.getRelationWithoutConstraints($name);

            if ($function) {
                $hashedColumn = this.getTable() === $relation.getTable() ?
                    `${$relation.getRelationCountHash(false)}.${$column}` :
                    $column;

                $wrappedColumn = $column === '*' ? $column : $relation.getRelated().qualifyColumn($hashedColumn);


                $expression = $function === 'exists' ? $wrappedColumn : sprintf('%s(%s)', $function, $wrappedColumn);
            } else {
                $expression = $column;
            }

            let $query = $relation.getRelationExistenceQuery(
                $relation.getRelated().newQuery(), this, this.raw($expression)
            );

            $query.callScope($constraints);

            $query = $query.mergeConstraintsFrom($relation.getQuery()).toBase();

            $query.clearOrder();
            let columns = $query._statements.filter(statement => statement.grouping === 'columns')
                .flatMap(statement => statement.value);
            if (count(columns) > 1) {
                $query.clearSelect();
                $query.select(columns[0]);
            }

            $alias = $alias || String.snake(
                $name + $function + $column.replace('/[^[:alnum:][:space:]_]/u', '')
            );

            let existingColumns = this.getQuery()._statements
                .filter(statement => statement.grouping === 'columns')
                .flatMap(statement => statement.value);
            existingColumns = existingColumns.length ? existingColumns : ['*']
            this.clearSelect();
            if ($function === 'exists') {
                this.select(this.newQuery().raw(
                    sprintf('exists(%s) as %s', $query.toSQL().sql, $alias),
                )
                );
            } else {
                $query = $function ? $query : $query.limit(1);
                this.select(
                    $query.as($alias)
                );
            }
            this.select(existingColumns)
        }

        return this;
    }

    withCount($relations) {
        return this.withAggregate(Array.isArray($relations) ? $relations : [...arguments], '*', 'count');
    }

    withMax($relation, $column) {
        return this.withAggregate($relation, $column, 'max');
    }

    withMin($relation, $column) {
        return this.withAggregate($relation, $column, 'min');
    }

    withSum($relation, $column) {
        return this.withAggregate($relation, $column, 'sum');
    }

    withAvg($relation, $column) {
        return this.withAggregate($relation, $column, 'avg');
    }

    withExists($relation) {
        return this.withAggregate($relation, '*', 'exists');
    }

    addHasWhere($hasQuery, $relation, $operator, $count, $boolean) {
        $hasQuery.mergeConstraintsFrom($relation.getQuery());

        return this.canUseExistsForExistenceCheck($operator, $count) ?
            this.addWhereExistsQuery($hasQuery.getQuery(), $boolean, $operator === '<' && $count === 1) :
            this.addWhereCountQuery($hasQuery.getQuery(), $operator, $count, $boolean);
    }

    mergeConstraintsFrom($from) {
        return this.withoutGlobalScopes(
            $from.removedScopes()
        )
    }

    addWhereCountQuery($query, $operator = '>=', $count = 1, $boolean = 'and') {

        let querytype = ($boolean == 'and' ? 'where' : 'orWhere')
        return this[querytype](
            this.raw('(' + $query.toSQL() + ')' + $operator + is_numeric($count) ? $count : $count),
        );
    }

    getRelationWithoutConstraints($relation) {
        return Relation.noConstraints(() => {
            if (typeof this.getModel()[$relation] != 'function') {
                throw RelationNotFoundException.make(this.getModel(), $relation);
            }
            return this.getModel()[$relation]();
        });
    }

    canUseExistsForExistenceCheck($operator, $count) {
        return ($operator === '>=' || $operator === '<') && $count === 1;
    }
}

module.exports = QueriesRelationships
