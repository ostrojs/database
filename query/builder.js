const Collection = require('@ostro/support/collection');
const { trim, last } = require('@ostro/support/function');
const Paginator = require('@ostro/pagination/paginator');
const LengthAwarePaginator = require('@ostro/pagination/lengthAwarePaginator');
const kPaginator = Symbol('paginator');
const kSimplePaginator = Symbol('simplePaginator');
const kQuery = Symbol('query');
class Builder {

	$connection;

	$grammar;

	get $query() {
		return this[kQuery];
	}

	set $query($value) {
		return this[kQuery] = $value
	}

	constructor($connection, $grammar, $knex) {
		this.$connection = $connection;
		this.$grammar = $grammar;
		this.$query = $knex
		this.$processor = $connection && $connection.getDefaultPostProcessor()
	}

	from() {
		this.$query = this.getQueryBuilder().from(...arguments)
		return this;
	}

	where() {
		this.getQueryBuilder().where(...arguments)
		return this;
	}

	whereColumn(column, operator, refColumn) {
		this.getQueryBuilder().whereRaw(column + operator + refColumn)
		return this;
	}

	whereNot() {
		this.getQueryBuilder().whereNot(...arguments)
		return this;
	}

	whereIn() {
		this.getQueryBuilder().whereIn(...arguments)
		return this;
	}

	whereNotIn() {
		this.getQueryBuilder().whereNotIn(...arguments)
		return this;
	}

	whereNull() {
		this.getQueryBuilder().whereNull(...arguments)
		return this;
	}

	whereNotNull() {
		this.getQueryBuilder().whereNotNull(...arguments)
		return this;
	}

	whereExists() {
		this.getQueryBuilder().whereExists(...arguments)
		return this;
	}

	whereNotExists() {
		this.getQueryBuilder().whereNotExists(...arguments)
		return this;
	}

	whereBetween() {
		this.getQueryBuilder().whereBetween(...arguments)
		return this;
	}

	whereNotBetween() {
		this.getQueryBuilder().whereNotBetween(...arguments)
		return this;
	}

	whereRaw() {
		this.getQueryBuilder().whereRaw(...arguments)
		return this;
	}

	wrap() {
		this.getQueryBuilder().wrap(...arguments)
		return this;
	}

	orWhere() {
		this.getQueryBuilder().orWhere(...arguments)
		return this;
	}

	orWhereNot() {
		this.getQueryBuilder().orWhereNot(...arguments)
		return this;
	}

	orWhereIn() {
		this.getQueryBuilder().orWhereIn(...arguments)
		return this;
	}

	orWhereNotIn() {
		this.getQueryBuilder().orWhereNotIn(...arguments)
		return this;
	}

	orWhereNull() {
		this.getQueryBuilder().orWhereNull(...arguments)
		return this;
	}

	orWhereExists() {
		this.getQueryBuilder().orWhereExists(...arguments)
		return this;
	}

	orWhereNotExists() {
		this.getQueryBuilder().orWhereNotExists(...arguments)
		return this;
	}

	orWhereBetween() {
		this.getQueryBuilder().orWhereBetween(...arguments)
		return this;
	}

	orWhereNotBetween() {
		this.getQueryBuilder().orWhereNotBetween(...arguments)
		return this;
	}

	innerJoin() {
		this.getQueryBuilder().innerJoin(...arguments)
		return this;
	}

	leftJoin() {
		this.getQueryBuilder().leftJoin(...arguments)
		return this;
	}

	leftOuterJoin() {
		this.getQueryBuilder().leftOuterJoin(...arguments)
		return this;
	}

	rightJoin() {
		this.getQueryBuilder().rightJoin(...arguments)
		return this;
	}

	rightOuterJoin() {
		this.getQueryBuilder().rightOuterJoin(...arguments)
		return this;
	}

	fullOuterJoin() {
		this.getQueryBuilder().fullOuterJoin(...arguments)
		return this;
	}

	crossJoin() {
		this.getQueryBuilder().crossJoin(...arguments)
		return this;
	}

	join() {
		this.getQueryBuilder().join(...arguments)
		return this;
	}

	joinRaw() {
		this.getQueryBuilder().joinRaw(...arguments)
		return this;
	}

	onIn() {
		this.getQueryBuilder().onIn(...arguments)
		return this;
	}

	onNotIn() {
		this.getQueryBuilder().onNotIn(...arguments)
		return this;
	}

	onNull() {
		this.getQueryBuilder().onNull(...arguments)
		return this;
	}

	onNotNull() {
		this.getQueryBuilder().onNotNull(...arguments)
		return this;
	}

	onExists() {
		this.getQueryBuilder().onExists(...arguments)
		return this;
	}

	onNotExists() {
		this.getQueryBuilder().onNotExists(...arguments)
		return this;
	}

	onBetween() {
		this.getQueryBuilder().onBetween(...arguments)
		return this;
	}

	onNotBetween() {
		this.getQueryBuilder().onNotBetween(...arguments)
		return this;
	}

	having() {
		this.getQueryBuilder().having(...arguments)
		return this;
	}

	havingIn() {
		this.getQueryBuilder().havingIn(...arguments)
		return this;
	}

	havingNotIn() {
		this.getQueryBuilder().havingNotIn(...arguments)
		return this;
	}

	havingNull() {
		this.getQueryBuilder().havingNull(...arguments)
		return this;
	}

	havingNotNull() {
		this.getQueryBuilder().havingNotNull(...arguments)
		return this;
	}

	havingExists() {
		this.getQueryBuilder().havingExists(...arguments)
		return this;
	}

	havingNotExists() {
		this.getQueryBuilder().havingNotExists(...arguments)
		return this;
	}

	havingBetween() {
		this.getQueryBuilder().havingBetween(...arguments)
		return this;
	}

	havingNotBetween() {
		this.getQueryBuilder().havingNotBetween(...arguments)
		return this;
	}

	havingRaw() {
		this.getQueryBuilder().havingRaw(...arguments)
		return this;
	}

	clearSelect() {
		this.getQueryBuilder().clearSelect(...arguments)
		return this;
	}

	clearWhere() {
		this.getQueryBuilder().clearWhere(...arguments)
		return this;
	}

	clearOrder() {
		this.getQueryBuilder().clearOrder(...arguments)
		return this;
	}

	clearHaving() {
		this.getQueryBuilder().clearHaving(...arguments)
		return this;
	}

	clearCounters() {
		this.getQueryBuilder().clearCounters(...arguments)
		return this;
	}

	distinct() {
		this.getQueryBuilder().distinct(...arguments)
		return this;
	}

	groupBy() {
		this.getQueryBuilder().groupBy(...arguments)
		return this;
	}

	groupByRaw() {
		this.getQueryBuilder().groupByRaw(...arguments)
		return this;
	}

	orderBy() {
		this.getQueryBuilder().orderBy(...arguments)
		return this;
	}

	orderByRaw() {
		this.getQueryBuilder().orderByRaw(...arguments)
		return this;
	}

	offset() {
		this.getQueryBuilder().offset(...arguments)
		return this;
	}

	limit() {
		this.getQueryBuilder().limit(...arguments)
		return this;
	}

	union() {
		this.getQueryBuilder().union(...arguments)
		return this;
	}

	unionAll() {
		this.getQueryBuilder().unionAll(...arguments)
		return this;
	}

	insert() {
		return this.getQueryBuilder().insert(...arguments)
	}

	batchInsert() {
		this.getQueryBuilder().batchInsert(...arguments)
		return this;
	}

	returning() {
		this.getQueryBuilder().havingBetween(...arguments)
		return this;
	}

	update() {
		return this.getQueryBuilder().update(...arguments)
	}

	delete() {
		return this.getQueryBuilder().delete(...arguments)
	}

	transacting() {
		this.getQueryBuilder().transacting(...arguments)
		return this;
	}

	forUpdate() {
		this.getQueryBuilder().forUpdate(...arguments)
		return this;
	}

	forShare() {
		this.getQueryBuilder().forShare(...arguments)
		return this;
	}

	skipLocked() {
		this.getQueryBuilder().skipLocked(...arguments)
		return this;
	}

	noWait() {
		return this.getQueryBuilder().noWait(...arguments)
	}

	async count(name) {
		name = name || '*';
		if (!name.includes('as')) {
			name = name + ' as countResult';
		}
		const query = this.getQueryBuilder();
		query.clearOrder();
		const data = await query.count(name);
		name = name.split('as ');
		name = trim(last(name), ' ');
		return Array.isArray(data) && data[0][name];

	}

	min() {
		return this.getQueryBuilder().min(...arguments)
	}

	max(max) {
		return this.getQueryBuilder().max(max).first()
	}

	sum() {
		return this.getQueryBuilder().sum(...arguments)
	}

	avg() {
		return this.getQueryBuilder().avg(...arguments)
	}

	increment() {
		return this.getQueryBuilder().increment(...arguments)
	}

	decrement() {
		return this.getQueryBuilder().decrement(...arguments)
	}

	truncate() {
		return this.getQueryBuilder().truncate(...arguments)
	}

	async pluck(key, value) {
		if (typeof value == 'string') {
			let datas = await this.select(key, value).collection()
			return datas.pluck(key, value)
		}
		return this.getQueryBuilder().pluck(key)
	}

	clone() {
		return this.getQueryBuilder().clone(...arguments)
	}

	modify() {
		return this.getQueryBuilder().modify(...arguments)
	}

	columnInfo() {
		return this.getQueryBuilder().columnInfo(...arguments)
	}

	queryContext() {
		this.getQueryBuilder().queryContext(...arguments)
		return this
	}

	query() {
		this.getQueryBuilder().query(...arguments)
		return this
	}

	select() {
		this.getQueryBuilder().select(...arguments)
		return this
	}

	as() {
		this.getQueryBuilder().as(...arguments)
		return this
	}

	column() {
		this.getQueryBuilder().column(...arguments)
		return this
	}

	select() {
		this.getQueryBuilder().select(...arguments)
		return this
	}

	getQueryBuilder() {
		return this.$query;
	}

	getQueryBuilder() {
		return this.$query
	}

	skip() {
		return this.offset(...arguments)
	}

	take() {
		return this.limit(...arguments)
	}

	toSQL() {
		return this.getQueryBuilder().toSQL()
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
		this.getQueryBuilder().orderBy('id', 'desc');
		return this;
	}

	value(key) {
		return this.first(key).then(res => (res) ? (res[key] || null) : null)
	}

	first(...select) {
		if (select[0] instanceof Array) {
			select = select[0]
		}
		return this.getQueryBuilder().first(select)
	}

	get() {
		return this.getQueryBuilder()
	}

	async exists() {
		return Boolean(await this.count());
	}

	forPage($page = 1, $perPage) {
		$page = ($page - 1) * $perPage
		return this.offset($page).limit($perPage)
	}

	collection() {
		return this.getQueryBuilder().then(res => new Collection(res))
	}

	request(request) {
		Object.defineProperty(this, '$request', { value: request });
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
