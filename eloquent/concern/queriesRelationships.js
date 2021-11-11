const Relation = require('../relations/relation')
class QueriesRelationships {

    has($relation, $operator = '>=', $count = 1, $boolean = 'and', $callback = null) {
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

    hasNested($relations, $operator = '>=', $count = 1, $boolean = 'and', $callback = null) {
        $relations = $relations.split('.');

        let $doesntHave = $operator === '<' && $count === 1;

        if ($doesntHave) {
            $operator = '>=';
            $count = 1;
        }

        let $closure = function($q) {

            count($relations) > 1 ?
                $q.whereHas($relations.shift(), $closure) :
                $q.has($relations.shift(), $operator, $count, 'and', $callback);
        };

        return this.has($relations.shift(), $doesntHave ? '<' : '>=', 1, $boolean, $closure);
    }

    orHas($relation, $operator = '>=', $count = 1) {
        return this.has($relation, $operator, $count, 'or');
    }

    doesntHave($relation, $boolean = 'and', $callback = null) {
        return this.has($relation, '<', 1, $boolean, $callback);
    }

    orDoesntHave($relation) {
        return this.doesntHave($relation, 'or');
    }

    whereHas($relation, $callback = null, $operator = '>=', $count = 1) {
        return this.has($relation, $operator, $count, 'and', $callback);
    }

    orWhereHas($relation, $callback = null, $operator = '>=', $count = 1) {
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

        if (is_null(this.$query.columns)) {
            this.$query.select([this.$query.from + '.*']);
        }

        $relations = is_array($relations) ? $relations : [$relations];

        for (let { $name, $constraints } in this.parseWithRelations($relations)) {

            let $segments = $name.split(' ');

            unset($alias);

            if (count($segments) === 3 && String.lower($segments[1]) === 'as') {
                [$name, $alias] = [$segments[0], $segments[2]];
            }

            $relation = this.getRelationWithoutConstraints($name);

            if ($function) {
                $hashedColumn = this.getQuery().from === $relation.getQuery().getQuery().from ?
                    "{$relation.getRelationCountHash(false)}.$column" :
                    $column;

                $wrappedColumn = this.getQuery().getGrammar().wrap(
                    $column === '*' ? $column : $relation.getRelated().qualifyColumn($hashedColumn)
                );

                $expression = $function === 'exists' ? $wrappedColumn : sprintf('%s(%s)', $function, $wrappedColumn);
            } else {
                $expression = $column;
            }

            $query = $relation.getRelationExistenceQuery(
                $relation.getRelated().newQuery(), this, new Expression($expression)
            ).setBindings([], 'select');

            $query.callScope($constraints);

            $query = $query.mergeConstraintsFrom($relation.getQuery()).toBase();

            $query.orders = null;
            $query.setBindings([], 'order');

            if (count($query.columns) > 1) {
                $query.columns = [$query.columns[0]];
                $query.bindings['select'] = [];
            }

            $alias = $alias || String.snake(
                preg_replace('/[^[:alnum:][:space:]_]/u', '', "$name $function $column")
            );

            if ($function === 'exists') {
                this.selectRaw(
                    sprintf('exists(%s) as %s', $query.toSql(), this.getQuery().grammar.wrap($alias)),
                    $query.getBindings()
                ).withCasts([$alias => 'bool']);
            } else {
                this.selectSub(
                    $function ? $query : $query.limit(1),
                    $alias
                );
            }
        }

        return this;
    }

    withCount($relations) {
        return this.withAggregate(Array.isArray($relations) ? $relations : arguments, '*', 'count');
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

    }

    addWhereCountQuery($query, $operator = '>=', $count = 1, $boolean = 'and') {

        let querytype = ($boolean == 'and' ? 'where' : 'orWhere')
        return this[querytype](
            this.raw('(' + $query.toSQL() + ')' + $operator + is_numeric($count) ? $count : $count),
        );
    }

    getRelationWithoutConstraints($relation) {
        return Relation.noConstraints(() => {
            return this.getModel()[$relation]();
        });
    }

    canUseExistsForExistenceCheck($operator, $count) {
        return ($operator === '>=' || $operator === '<') && $count === 1;
    }
}

module.exports = QueriesRelationships