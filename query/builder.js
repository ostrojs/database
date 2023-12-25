const Collection = require('@ostro/support/collection');
const { trim, last } = require('@ostro/support/function');
const Paginator = require('@ostro/pagination/paginator');
const LengthAwarePaginator = require('@ostro/pagination/lengthAwarePaginator');
const kPaginator = Symbol('paginator');
const kSimplePaginator = Symbol('simplePaginator');
class Builder {
	from() {
		this.getQuery().from(...arguments)
		return this;
	}
	where() {
		this.getQuery().where(...arguments)
		return this;
	}
	whereColumn(column, operator, refColumn) {
		this.getQuery().whereRaw(column + operator + refColumn)
		return this;
	}

	whereNot() {
		this.getQuery().whereNot(...arguments)
		return this;
	}
	whereIn() {
		this.getQuery().whereIn(...arguments)
		return this;
	}
	whereNotIn() {
		this.getQuery().whereNotIn(...arguments)
		return this;
	}
	whereNull() {
		this.getQuery().whereNull(...arguments)
		return this;
	}
	whereNotNull() {
		this.getQuery().whereNotNull(...arguments)
		return this;
	}
	whereExists() {
		this.getQuery().whereExists(...arguments)
		return this;
	}
	whereNotExists() {
		this.getQuery().whereNotExists(...arguments)
		return this;
	}
	whereBetween() {
		this.getQuery().whereBetween(...arguments)
		return this;
	}
	whereNotBetween() {
		this.getQuery().whereNotBetween(...arguments)
		return this;
	}
	whereRaw() {
		this.getQuery().whereRaw(...arguments)
		return this;
	}

	orWhere() {
		this.getQuery().orWhere(...arguments)
		return this;
	}

	orWhereNot() {
		this.getQuery().orWhereNot(...arguments)
		return this;
	}

	orWhereIn() {
		this.getQuery().orWhereIn(...arguments)
		return this;
	}

	orWhereNotIn() {
		this.getQuery().orWhereNotIn(...arguments)
		return this;
	}

	orWhereNull() {
		this.getQuery().orWhereNull(...arguments)
		return this;
	}
	orWhereExists() {
		this.getQuery().orWhereExists(...arguments)
		return this;
	}
	orWhereNotExists() {
		this.getQuery().orWhereNotExists(...arguments)
		return this;
	}
	orWhereBetween() {
		this.getQuery().orWhereBetween(...arguments)
		return this;
	}
	orWhereNotBetween() {
		this.getQuery().orWhereNotBetween(...arguments)
		return this;
	}
	innerJoin() {
		this.getQuery().innerJoin(...arguments)
		return this;
	}
	leftJoin() {
		this.getQuery().leftJoin(...arguments)
		return this;
	}
	leftOuterJoin() {
		this.getQuery().leftOuterJoin(...arguments)
		return this;
	}
	rightJoin() {
		this.getQuery().rightJoin(...arguments)
		return this;
	}
	rightOuterJoin() {
		this.getQuery().rightOuterJoin(...arguments)
		return this;
	}
	fullOuterJoin() {
		this.getQuery().fullOuterJoin(...arguments)
		return this;
	}
	crossJoin() {
		this.getQuery().crossJoin(...arguments)
		return this;
	}
	join() {
		this.getQuery().join(...arguments)
		return this;
	}

	joinRaw() {
		this.getQuery().joinRaw(...arguments)
		return this;
	}
	onIn() {
		this.getQuery().onIn(...arguments)
		return this;
	}
	onNotIn() {
		this.getQuery().onNotIn(...arguments)
		return this;
	}
	onNull() {
		this.getQuery().onNull(...arguments)
		return this;
	}
	onNotNull() {
		this.getQuery().onNotNull(...arguments)
		return this;
	}
	onExists() {
		this.getQuery().onExists(...arguments)
		return this;
	}
	onNotExists() {
		this.getQuery().onNotExists(...arguments)
		return this;
	}
	onBetween() {
		this.getQuery().onBetween(...arguments)
		return this;
	}
	onNotBetween() {
		this.getQuery().onNotBetween(...arguments)
		return this;
	}
	having() {
		this.getQuery().having(...arguments)
		return this;
	}
	havingIn() {
		this.getQuery().havingIn(...arguments)
		return this;
	}
	havingNotIn() {
		this.getQuery().havingNotIn(...arguments)
		return this;
	}
	havingNull() {
		this.getQuery().havingNull(...arguments)
		return this;
	}
	havingNotNull() {
		this.getQuery().havingNotNull(...arguments)
		return this;
	}
	havingExists() {
		this.getQuery().havingExists(...arguments)
		return this;
	}
	havingNotExists() {
		this.getQuery().havingNotExists(...arguments)
		return this;
	}
	havingBetween() {
		this.getQuery().havingBetween(...arguments)
		return this;
	}
	havingNotBetween() {
		this.getQuery().havingNotBetween(...arguments)
		return this;
	}
	havingRaw() {
		this.getQuery().havingRaw(...arguments)
		return this;
	}
	clearSelect() {
		this.getQuery().clearSelect(...arguments)
		return this;
	}
	clearWhere() {
		this.getQuery().clearWhere(...arguments)
		return this;
	}
	clearOrder() {
		this.getQuery().clearOrder(...arguments)
		return this;
	}
	clearHaving() {
		this.getQuery().clearHaving(...arguments)
		return this;
	}
	clearCounters() {
		this.getQuery().clearCounters(...arguments)
		return this;
	}
	distinct() {
		this.getQuery().distinct(...arguments)
		return this;
	}
	groupBy() {
		this.getQuery().groupBy(...arguments)
		return this;
	}
	groupByRaw() {
		this.getQuery().groupByRaw(...arguments)
		return this;
	}
	orderBy() {
		this.getQuery().orderBy(...arguments)
		return this;
	}
	orderByRaw() {
		this.getQuery().orderByRaw(...arguments)
		return this;
	}
	offset() {
		this.getQuery().offset(...arguments)
		return this;
	}
	limit() {
		this.getQuery().limit(...arguments)
		return this;
	}
	union() {
		this.getQuery().union(...arguments)
		return this;
	}
	unionAll() {
		this.getQuery().unionAll(...arguments)
		return this;
	}
	insert() {
		return this.getQuery().insert(...arguments)
	}
	batchInsert() {
		this.getQuery().batchInsert(...arguments)
		return this;
	}
	returning() {
		this.getQuery().havingBetween(...arguments)
		return this;
	}
	update() {
		return this.getQuery().update(...arguments)
	}
	delete() {
		return this.getQuery().delete(...arguments)
	}
	transacting() {
		this.getQuery().transacting(...arguments)
		return this;
	}
	forUpdate() {
		this.getQuery().forUpdate(...arguments)
		return this;
	}
	forShare() {
		this.getQuery().forShare(...arguments)
		return this;
	}
	skipLocked() {
		this.getQuery().skipLocked(...arguments)
		return this;
	}
	noWait() {
		return this.getQuery().noWait(...arguments)
	}
	async count(name) {
		name = name || '*';
		const data = await this.getQuery().count(name);
		if (name.includes('as')) {
			name = name.split('as ');
			name = trim(last(name), ' ')
		} else {
			name = name == '*' ? 'count(*)' : `count(\`${name}\`)`
		}
		return data[0][name];

	}
	min() {
		return this.getQuery().min(...arguments)
	}
	max(max) {
		return this.getQuery().max(max).first()
	}
	sum() {
		return this.getQuery().sum(...arguments)
	}
	avg() {
		return this.getQuery().avg(...arguments)
	}
	increment() {
		return this.getQuery().increment(...arguments)
	}
	decrement() {
		return this.getQuery().decrement(...arguments)
	}
	truncate() {
		return this.getQuery().truncate(...arguments)
	}
	async pluck(key, value) {
		if (typeof value == 'string') {
			let datas = await this.select(key, value).collection()
			return datas.pluck(key, value)
		}
		return this.getQuery().pluck(key)
	}

	clone() {
		return this.getQuery().clone(...arguments)
	}
	modify() {
		return this.getQuery().modify(...arguments)
	}
	columnInfo() {
		return this.getQuery().columnInfo(...arguments)
	}
	queryContext() {
		this.getQuery().queryContext(...arguments)
		return this
	}
	query() {
		this.getQuery().query(...arguments)
		return this
	}

	select() {
		this.getQuery().select(...arguments)
		return this
	}
	as() {
		this.getQuery().as(...arguments)
		return this
	}
	column() {
		this.getQuery().column(...arguments)
		return this
	}
	select() {
		this.getQuery().select(...arguments)
		return this
	}

	getQuery() {
		return this.$query
	}

	skip() {
		return this.offset(...arguments)
	}

	take() {
		return this.limit(...arguments)
	}

	toSQL() {
		return this.getQuery().toSQL()
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
				return this.insert({
					...whereObj,
					...updateObj
				})
		})
	}

	latest() {
		this.getQuery().orderBy('id', 'desc');
		return this;
	}

	value(key) {
		return this.first(key).then(res => (res) ? (res[key] || null) : null)
	}

	first(...select) {
		if (select[0] instanceof Array) {
			select = select[0]
		}
		return this.getQuery().first(select)
	}

	get() {
		return this.getQuery()
	}

	async exists() {
		return Boolean(await this.count());
	}

	forPage($page = 1, $perPage) {
		$page = ($page - 1) * $perPage
		return this.offset($page).limit($perPage)
	}

	collection() {
		return this.getQuery().then(res => new Collection(res))
	}

	request(request) {
		Object.defineProperty(this, '$request', { value: request, writable: false });
		return this
	}

	async paginate($perPage = 15, $pageName = 'page', $page = null, $total = null) {

		$page = parseInt($page || this.$request.input($pageName, 1));
		$total = $total ?? await this.clone().count();
		$perPage = typeof $perPage == 'function?' ? $perPage($total) : $perPage;
		const $results = $total ? await this.forPage($page, $perPage).get() : new Collection([]);

		return this[kPaginator]($results, $total, $perPage, $page, {
			"$path": this.$request.path(),
			'$pageName': $pageName,
		});
	}

	async simplePaginate($perPage = 15, $page = 1) {

		$page = parseInt($page || this.$request.input($pageName));
		this.offset(($page - 1) * $perPage).limit($perPage + 1);
		return this[kSimplePaginator](await this.get(), $perPage, $page, {
			"$path": this.$request.path(),
			'$pageName': $pageName,
		});
	}

	[kPaginator]($items, $total, $perPage, $currentPage, $option) {
		return new LengthAwarePaginator($items, $total, $perPage, $currentPage, $option, this.$request)
	}

	[kSimplePaginator]($items, $perPage, $currentPage, $option) {
		return new Paginator($items, $perPage, $currentPage, $option, this.$request)
	}

}
module.exports = Builder
