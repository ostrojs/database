import { is_string, strpos, empty, count, is_null, is_array, is_numeric } from '@ostro/support/function';
import { snake, lower } from '@ostro/support/string';
import Relation from '../relations/relation';
import RelationNotFoundException from '../relationNotFoundException';
import knex from 'knex';
/**
 * Class QueriesRelationships.
 */
class QueriesRelationships {
    [key: string]: any;

    /**
     * has method.
     * @param {*} $relation
     * @param {*} $operator
     * @param {*} $count
     * @param {*} $boolean
     * @param {*} $callback
     * @returns {any}
     */
    public has($relation: any, $operator: string = '>=', $count: number = 1, $boolean: string = 'and', $callback?: Function) {
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

    /**
     * hasNested method.
     * @param {*} $relations
     * @param {*} $operator
     * @param {*} $count
     * @param {*} $boolean
     * @returns {any}
     */
    public hasNested($relations: any, $operator: string = '>=', $count: number = 1, $boolean: string = 'and', $callback?: any) {
        $callback = $callback || Array.from(arguments).find(arg => typeof arg == 'function')

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

    /**
     * orHas method.
     * @param {*} $relation
     * @param {*} $operator
     * @param {*} $count
     * @returns {any}
     */
    public orHas($relation: any, $operator: string = '>=', $count: number = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'or', $callback);
    }

    /**
     * doesntHave method.
     * @param {*} $relation
     * @param {*} $boolean
     * @returns {any}
     */
    public doesntHave($relation: any, $boolean: string = 'and', $callback?: any) {
        $callback = $callback || Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, '<', 1, $boolean, $callback);
    }

    /**
     * orDoesntHave method.
     * @param {*} $relation
     * @param {*} $callback
     * @returns {any}
     */
    public orDoesntHave($relation: any, $callback: Function) {
        return this.doesntHave($relation, 'or', $callback);
    }

    /**
     * whereHas method.
     * @param {*} $relation
     * @param {*} $operator
     * @param {*} $count
     * @returns {any}
     */
    public whereHas($relation: any, $operator: string = '>=', $count: number = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'and', $callback);
    }

    /**
     * orWhereHas method.
     * @param {*} $relation
     * @param {*} $operator
     * @param {*} $count
     * @returns {any}
     */
    public orWhereHas($relation: any, $operator: string = '>=', $count: number = 1) {
        let $callback = Array.from(arguments).find(arg => typeof arg == 'function')

        return this.has($relation, $operator, $count, 'or', $callback);
    }

    /**
     * whereDoesntHave method.
     * @param {*} $relation
     * @param {*} $callback
     * @returns {any}
     */
    public whereDoesntHave($relation: any, $callback: any = null) {
        return this.doesntHave($relation, 'and', $callback);
    }

    /**
     * orWhereDoesntHave method.
     * @param {*} $relation
     * @param {*} $callback
     * @returns {any}
     */
    public orWhereDoesntHave($relation: any, $callback: any = null) {
        return this.doesntHave($relation, 'or', $callback);
    }

    /**
     * getBelongsToRelation method.
     * @param {*} $relation
     * @param {*} $type
     * @returns {any}
     */
    public getBelongsToRelation($relation: any, $type: string) {
        let $belongsTo = Relation.noConstraints(() => {
            return this.getModel().belongsTo(
                $type,
                $relation.getForeignKeyName(),
                $relation.getOwnerKeyName(),
                $relation.getRelationName()
            );
        });

        $belongsTo.getQuery().mergeConstraintsFrom($relation.getQuery());

        return $belongsTo;
    }

    /**
     * withAggregate method.
     * @param {*} $relations
     * @param {*} $column
     * @param {*} $function
     * @returns {any}
     */
    public withAggregate($relations: any, $column: string, $function: any = null) {

        if (empty($relations)) {
            return this;
        }
        let selfBuilder = this.getQueryBuilder();
        let statements = selfBuilder._statements;
        let selftColumns = statements.filter(statement => statement.grouping === 'columns')
            .flatMap(statement => statement.value);
        if (selftColumns.length === 0) {

            this.select(this.getTable() + '.*');
        }

        $relations = (typeof $relations === 'object' && !Array.isArray($relations)) ? $relations : (is_array($relations) ? $relations : [$relations]);
        const parsedRelations = this.parseWithRelations($relations);

        for (let $name in parsedRelations) {
            const $constraints = parsedRelations[$name];
            let $segments = $name.split(' ');
            let $alias, $expression, $hashedColumn, $wrappedColumn;
            if (count($segments) === 3 && lower($segments[1]) === 'as') {
                $name = $segments[0];
                $alias = $segments[2];
            }

            let $relation = this.getRelationWithoutConstraints($name);

            if ($function) {
                $hashedColumn = this.getTable() === $relation.getTable() ?
                    `${$relation.getRelationCountHash(false)}.${$column}` :
                    $column;

                $wrappedColumn = $column === '*' ? $column : $relation.getRelated().qualifyColumn($hashedColumn);


                $expression = $function === 'exists' ? $wrappedColumn : `${$function}(${$wrappedColumn})`;
            } else {
                $expression = $column;
            }

            const rawFn = (sql) => this.raw(sql);
            let $query = $relation.getRelationExistenceQuery(
                $relation.getRelated().newQuery(), this, rawFn($expression)
            );

            $query.callScope($constraints);

            $query = $query.mergeConstraintsFrom($relation.getQuery()).toBase();

            let queryStatementsSub = $query.getQueryBuilder()._statements;
            let columns = queryStatementsSub.filter(statement => statement.grouping === 'columns')
                .flatMap(statement => statement.value);
            if (count(columns) > 1) {
                let col0 = columns[0];
                let subBuilder = $query.getQueryBuilder();
                subBuilder._statements = queryStatementsSub.filter(statement => statement.grouping !== 'columns');
                $query.select(col0);
            }

            $alias = $alias || (
                $function === 'count' ? snake($name) + '_count' : snake($name + '_' + $function + ($column !== '*' ? '_' + $column.replace(/[^a-zA-Z0-9_]/g, '') : ''))
            );

            let mainBuilder = this.getQueryBuilder();
            let queryStatements = mainBuilder._statements;
            let existingColumns = queryStatements
                .filter(statement => statement.grouping === 'columns')
                .flatMap(statement => statement.value);
            this.clearSelect();
            if ($function === 'exists') {
                this.select(rawFn(`exists(${$query.toSQL().sql}) as ${$alias}`));
            } else {
                let sql = $query.toSQL().sql;
                this.select(rawFn(`(${sql}) as ${$alias}`));
            }
            this.select(existingColumns);
        }

        return this;
    }

    /**
     * withCount method.
     * @param {*} $relations
     * @returns {any}
     */
    public withCount($relations: any) {
        return this.withAggregate((typeof $relations === 'object' && !Array.isArray($relations)) ? $relations : (Array.isArray($relations) ? $relations : [...arguments]), '*', 'count');
    }

    /**
     * withMax method.
     * @param {*} $relation
     * @param {*} $column
     * @returns {any}
     */
    public withMax($relation: any, $column: string) {
        return this.withAggregate($relation, $column, 'max');
    }

    /**
     * withMin method.
     * @param {*} $relation
     * @param {*} $column
     * @returns {any}
     */
    public withMin($relation: any, $column: string) {
        return this.withAggregate($relation, $column, 'min');
    }

    /**
     * withSum method.
     * @param {*} $relation
     * @param {*} $column
     * @returns {any}
     */
    public withSum($relation: any, $column: string) {
        return this.withAggregate($relation, $column, 'sum');
    }

    /**
     * withAvg method.
     * @param {*} $relation
     * @param {*} $column
     * @returns {any}
     */
    public withAvg($relation: any, $column: string) {
        return this.withAggregate($relation, $column, 'avg');
    }

    /**
     * withExists method.
     * @param {*} $relation
     * @returns {any}
     */
    public withExists($relation: any) {
        return this.withAggregate($relation, '*', 'exists');
    }

    /**
     * addHasWhere method.
     * @param {*} $hasQuery
     * @param {*} $relation
     * @param {*} $operator
     * @param {*} $count
     * @param {*} $boolean
     * @returns {any}
     */
    public addHasWhere($hasQuery: any, $relation: any, $operator: string, $count: number, $boolean: string) {
        $hasQuery.mergeConstraintsFrom($relation.getQuery());

        return this.canUseExistsForExistenceCheck($operator, $count) ?
            this.addWhereExistsQuery($hasQuery.getQuery(), $boolean, $operator === '<' && $count === 1) :
            this.addWhereCountQuery($hasQuery.getQuery(), $operator, $count, $boolean);
    }

    /**
     * mergeConstraintsFrom method.
     * @param {*} $from
     * @returns {any}
     */
    public mergeConstraintsFrom($from: any) {
        return this.withoutGlobalScopes(
            $from.removedScopes()
        )
    }

    /**
     * addWhereCountQuery method.
     * @param {*} $query
     * @param {*} $operator
     * @param {*} $count
     * @param {*} $boolean
     * @returns {any}
     */
    public addWhereCountQuery($query: any, $operator: string = '>=', $count: number = 1, $boolean: string = 'and') {
        let querytype = ($boolean == 'and' ? 'where' : 'orWhere');
        let sql = $query.toSQL().sql;
        let countVal = is_numeric($count) ? $count : `'${$count}'`;
        return this[querytype](
            this.raw('(' + sql + ') ' + $operator + ' ' + countVal)
        );
    }

    /**
     * getRelationWithoutConstraints method.
     * @param {*} $relation
     * @returns {any}
     */
    public getRelationWithoutConstraints($relation: any) {
        return Relation.noConstraints(() => {
            if (typeof this.getModel()[$relation] != 'function') {
                throw RelationNotFoundException.make(this.getModel(), $relation);
            }
            return this.getModel()[$relation]();
        });
    }

    /**
     * canUseExistsForExistenceCheck method.
     * @param {*} $operator
     * @param {*} $count
     * @returns {any}
     */
    public canUseExistsForExistenceCheck($operator: string, $count: number) {
        return ($operator === '>=' || $operator === '<') && $count === 1;
    }
}

export default QueriesRelationships;
