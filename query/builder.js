const Collection = require('@ostro/support/collection')

class Builder {
    from() {
         this.$query.from(...arguments)
        return this;
    }
    where() {
         this.$query.where(...arguments)
        return this;
    }

    whereNot() {
         this.$query.whereNot(...arguments)
        return this;
    }
    whereIn() {
         this.$query.whereIn(...arguments)
        return this;
    }
    whereNotIn() {
         this.$query.whereNotIn(...arguments)
        return this;
    }
    whereNull() {
         this.$query.whereNull(...arguments)
        return this;
    }
    whereNotNull() {
         this.$query.whereNotNull(...arguments)
        return this;
    }
    whereExists() {
         this.$query.whereExists(...arguments)
        return this;
    }
    whereNotExists() {
         this.$query.whereNotExists(...arguments)
        return this;
    }
    whereBetween() {
         this.$query.whereBetween(...arguments)
        return this;
    }
    whereNotBetween() {
         this.$query.whereNotBetween(...arguments)
        return this;
    }
    whereRaw() {
         this.$query.whereRaw(...arguments)
        return this;
    }

    orWhere() {
         this.$query.orWhere(...arguments)
        return this;
    }

    orWhereNot() {
         this.$query.orWhereNot(...arguments)
        return this;
    }

    orWhereIn() {
         this.$query.orWhereIn(...arguments)
        return this;
    }

    orWhereNotIn() {
         this.$query.orWhereNotIn(...arguments)
        return this;
    }

    orWhereNull() {
         this.$query.orWhereNull(...arguments)
        return this;
    }
    orWhereExists() {
         this.$query.orWhereExists(...arguments)
        return this;
    }
    orWhereNotExists() {
         this.$query.orWhereNotExists(...arguments)
        return this;
    }
    orWhereBetween() {
         this.$query.orWhereBetween(...arguments)
        return this;
    }
    orWhereNotBetween() {
         this.$query.orWhereNotBetween(...arguments)
        return this;
    }
    innerJoin() {
         this.$query.innerJoin(...arguments)
        return this;
    }
    leftJoin() {
         this.$query.leftJoin(...arguments)
        return this;
    }
    leftOuterJoin() {
         this.$query.leftOuterJoin(...arguments)
        return this;
    }
    rightJoin() {
         this.$query.rightJoin(...arguments)
        return this;
    }
    rightOuterJoin() {
         this.$query.rightOuterJoin(...arguments)
        return this;
    }
    fullOuterJoin() {
         this.$query.fullOuterJoin(...arguments)
        return this;
    }
    crossJoin() {
         this.$query.crossJoin(...arguments)
        return this;
    }
    join() {
         this.$query.join(...arguments)
        return this;
    }

    joinRaw() {
         this.$query.joinRaw(...arguments)
        return this;
    }
    onIn() {
         this.$query.onIn(...arguments)
        return this;
    }
    onNotIn() {
         this.$query.onNotIn(...arguments)
        return this;
    }
    onNull() {
         this.$query.onNull(...arguments)
        return this;
    }
    onNotNull() {
         this.$query.onNotNull(...arguments)
        return this;
    }
    onExists() {
         this.$query.onExists(...arguments)
        return this;
    }
    onNotExists() {
         this.$query.onNotExists(...arguments)
        return this;
    }
    onBetween() {
         this.$query.onBetween(...arguments)
        return this;
    }
    onNotBetween() {
         this.$query.onNotBetween(...arguments)
        return this;
    }
    having() {
         this.$query.having(...arguments)
        return this;
    }
    havingIn() {
         this.$query.havingIn(...arguments)
        return this;
    }
    havingNotIn() {
         this.$query.havingNotIn(...arguments)
        return this;
    }
    havingNull() {
         this.$query.havingNull(...arguments)
        return this;
    }
    havingNotNull() {
         this.$query.havingNotNull(...arguments)
        return this;
    }
    havingExists() {
         this.$query.havingExists(...arguments)
        return this;
    }
    havingNotExists() {
         this.$query.havingNotExists(...arguments)
        return this;
    }
    havingBetween() {
         this.$query.havingBetween(...arguments)
        return this;
    }
    havingNotBetween() {
         this.$query.havingNotBetween(...arguments)
        return this;
    }
    havingRaw() {
         this.$query.havingRaw(...arguments)
        return this;
    }
    clearSelect() {
         this.$query.clearSelect(...arguments)
        return this;
    }
    clearWhere() {
         this.$query.clearWhere(...arguments)
        return this;
    }
    clearOrder() {
         this.$query.clearOrder(...arguments)
        return this;
    }
    clearHaving() {
         this.$query.clearHaving(...arguments)
        return this;
    }
    clearCounters() {
         this.$query.clearCounters(...arguments)
        return this;
    }
    distinct() {
         this.$query.distinct(...arguments)
        return this;
    }
    groupBy() {
         this.$query.groupBy(...arguments)
        return this;
    }
    groupByRaw() {
         this.$query.groupByRaw(...arguments)
        return this;
    }
    orderBy() {
         this.$query.orderBy(...arguments)
        return this;
    }
    orderByRaw() {
         this.$query.orderByRaw(...arguments)
        return this;
    }
    offset() {
         this.$query.offset(...arguments)
        return this;
    }
    limit() {
         this.$query.limit(...arguments)
        return this;
    }
    union() {
         this.$query.union(...arguments)
        return this;
    }
    unionAll() {
         this.$query.unionAll(...arguments)
        return this;
    }
    insert() {
        return this.$query.insert(...arguments)
    }
    batchInsert() {
         this.$query.batchInsert(...arguments)
        return this;
    }
    returning() {
         this.$query.havingBetween(...arguments)
        return this;
    }
    update() {
        return this.$query.update(...arguments)
    }
    delete() {
        return this.$query.delete(...arguments)
    }
    transacting() {
         this.$query.transacting(...arguments)
        return this;
    }
    forUpdate() {
         this.$query.forUpdate(...arguments)
        return this;
    }
    forShare() {
         this.$query.forShare(...arguments)
        return this;
    }
    skipLocked() {
         this.$query.skipLocked(...arguments)
        return this;
    }
    noWait() {
        return this.$query.noWait(...arguments)
    }
    count() {
        return this.$query.count(...arguments)
    }
    min() {
        return this.$query.min(...arguments)
    }
    max(max) {
        return this.$query.max(max).first()
    }
    sum() {
        return this.$query.sum(...arguments)
    }
    avg() {
        return this.$query.avg(...arguments)
    }
    increment() {
        return this.$query.increment(...arguments)
    }
    decrement() {
        return this.$query.decrement(...arguments)
    }
    truncate() {
        return this.$query.truncate(...arguments)
    }
    async pluck(key, value) {
        if (typeof value == 'string') {
            let datas = await this.select(key, value).collection()
            return datas.pluck(key, value)
        }
        return this.$query.pluck(key)
    }

    clone() {
        return this.$query.clone(...arguments)
    }
    modify() {
        return this.$query.modify(...arguments)
    }
    columnInfo() {
        return this.$query.columnInfo(...arguments)
    }
    queryContext() {
         this.$query.queryContext(...arguments)
        return this
    }
    query() {
         this.$query.query(...arguments)
        return this
    }

    select() {
         this.$query.select(...arguments)
        return this
    }
    as() {
         this.$query.as(...arguments)
        return this
    }
    column() {
         this.$query.column(...arguments)
        return this
    }
    select() {
         this.$query.select(...arguments)
        return this
    }

    skip() {
        return this.offset(...arguments)
    }

    take() {
        return this.limit(...arguments)
    }

    toSQL() {
        return this.$query.toSQL()
    }
    toSql() {
        return this.toSQL()
    }

    newQuery() {
        return new this.constructor
    }

    addWhereExistsQuery($query, $boolean = 'and', $not = false) {
        let $type = $not ? 'NotExists' : 'Exists';
        let querytype = ($boolean == 'and' ? 'where' : 'orWhere') + $type
        this[querytype]($query);
        return this;
    }

    updateOrInsert(whereObj, updateObj) {
        return this.where(whereObj).first().then(res => {
            if (res)
                return this.where(whereObj).update(updateObj)
            else
                return this.insert({ ...whereObj,
                    ...updateObj
                })
        })
    }

    value(key) {
        return this.first(key).then(res => (res) ? (res[key] || null) : null)
    }

    first(...select) {
        if (select[0] instanceof Array) {
            select = select[0]
        }
        return this.$query.first(select)
    }
    get() {
        return this.$query
    }

    collection() {
        return this.$query.then(res => new Collection(res))
    }
}
module.exports = Builder