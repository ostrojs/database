import Collection from '@ostro/support/collection';
import type { Knex } from 'knex';
import { trim, last } from '@ostro/support/function';
import Paginator from '@ostro/pagination/paginator';
import LengthAwarePaginator from '@ostro/pagination/lengthAwarePaginator';

/**
 * Class Builder.
 */
class Builder {

	public $connection: any;

	public $grammar: any;

	public $processor: any;

	public $request: any = null;

	protected _query: Knex.QueryBuilder | any;

	get $query(): Knex.QueryBuilder | any {
		return this._query;
	}

	set $query($value: Knex.QueryBuilder | any) {
		this._query = $value;
	}

	/**
	 * Create a new instance.
	 * @param {*} $connection
	 * @param {*} $grammar
	 * @param {*} $knex
	 */
	constructor($connection?: any, $grammar?: any, $knex?: any) {
		this.$connection = $connection;
		this.$grammar = $grammar;
		this.$query = $knex
		this.$processor = $connection && $connection.getDefaultPostProcessor()
	}

	/**
	 * from method.
	 * @returns {any}
	 */
	from(...args: any[]) {
		this.$query = this.getQuery().from(...args);
		return this;
	}

	/**
	 * where method.
	 * @returns {any}
	 */
	where(...args: any[]) {
		this.getQueryBuilder().where(...args)
		return this;
	}

	/**
	 * whereColumn method.
	 * @param {*} column
	 * @param {*} operator
	 * @param {*} refColumn
	 * @returns {any}
	 */
	whereColumn(column, operator, refColumn) {
		this.getQueryBuilder().whereRaw(column + operator + refColumn)
		return this;
	}

	/**
	 * whereNot method.
	 * @returns {any}
	 */
	whereNot() {
		this.getQueryBuilder().whereNot(...arguments)
		return this;
	}

	/**
	 * whereIn method.
	 * @returns {any}
	 */
	whereIn() {
		this.getQueryBuilder().whereIn(...arguments)
		return this;
	}

	/**
	 * whereNotIn method.
	 * @returns {any}
	 */
	whereNotIn() {
		this.getQueryBuilder().whereNotIn(...arguments)
		return this;
	}

	/**
	 * whereNull method.
	 * @returns {any}
	 */
	whereNull() {
		this.getQueryBuilder().whereNull(...arguments)
		return this;
	}

	/**
	 * whereNotNull method.
	 * @returns {any}
	 */
	whereNotNull() {
		this.getQueryBuilder().whereNotNull(...arguments)
		return this;
	}

	/**
	 * whereExists method.
	 * @param {*} query
	 * @returns {any}
	 */
	whereExists(query) {
		const raw = query && typeof query.getQueryBuilder == 'function' ? query.getQueryBuilder() : (query && query.$query ? query.$query : query);
		this.getQueryBuilder().whereExists(raw);
		return this;
	}

	/**
	 * whereNotExists method.
	 * @param {*} query
	 * @returns {any}
	 */
	whereNotExists(query) {
		const raw = query && typeof query.getQueryBuilder == 'function' ? query.getQueryBuilder() : (query && query.$query ? query.$query : query);
		this.getQueryBuilder().whereNotExists(raw);
		return this;
	}

	/**
	 * whereBetween method.
	 * @returns {any}
	 */
	whereBetween() {
		this.getQueryBuilder().whereBetween(...arguments)
		return this;
	}

	/**
	 * whereNotBetween method.
	 * @returns {any}
	 */
	whereNotBetween() {
		this.getQueryBuilder().whereNotBetween(...arguments)
		return this;
	}

	/**
	 * whereRaw method.
	 * @returns {any}
	 */
	whereRaw() {
		this.getQueryBuilder().whereRaw(...arguments)
		return this;
	}

	/**
	 * wrap method.
	 * @returns {any}
	 */
	wrap() {
		this.getQueryBuilder().wrap(...arguments)
		return this;
	}

	/**
	 * orWhere method.
	 * @returns {any}
	 */
	orWhere() {
		this.getQueryBuilder().orWhere(...arguments)
		return this;
	}

	/**
	 * orWhereNot method.
	 * @returns {any}
	 */
	orWhereNot() {
		this.getQueryBuilder().orWhereNot(...arguments)
		return this;
	}

	/**
	 * orWhereIn method.
	 * @returns {any}
	 */
	orWhereIn() {
		this.getQueryBuilder().orWhereIn(...arguments)
		return this;
	}

	/**
	 * orWhereNotIn method.
	 * @returns {any}
	 */
	orWhereNotIn() {
		this.getQueryBuilder().orWhereNotIn(...arguments)
		return this;
	}

	/**
	 * orWhereNull method.
	 * @returns {any}
	 */
	orWhereNull() {
		this.getQueryBuilder().orWhereNull(...arguments)
		return this;
	}

	/**
	 * orWhereExists method.
	 * @param {*} query
	 * @returns {any}
	 */
	orWhereExists(query) {
		const raw = query && typeof query.getQueryBuilder == 'function' ? query.getQueryBuilder() : (query && query.$query ? query.$query : query);
		this.getQueryBuilder().orWhereExists(raw);
		return this;
	}

	/**
	 * orWhereNotExists method.
	 * @param {*} query
	 * @returns {any}
	 */
	orWhereNotExists(query) {
		const raw = query && typeof query.getQueryBuilder == 'function' ? query.getQueryBuilder() : (query && query.$query ? query.$query : query);
		this.getQueryBuilder().orWhereNotExists(raw);
		return this;
	}

	/**
	 * orWhereBetween method.
	 * @returns {any}
	 */
	orWhereBetween() {
		this.getQueryBuilder().orWhereBetween(...arguments)
		return this;
	}

	/**
	 * orWhereNotBetween method.
	 * @returns {any}
	 */
	orWhereNotBetween() {
		this.getQueryBuilder().orWhereNotBetween(...arguments)
		return this;
	}

	/**
	 * innerJoin method.
	 * @returns {any}
	 */
	innerJoin() {
		this.getQueryBuilder().innerJoin(...arguments)
		return this;
	}

	/**
	 * leftJoin method.
	 * @returns {any}
	 */
	leftJoin() {
		this.getQueryBuilder().leftJoin(...arguments)
		return this;
	}

	/**
	 * leftOuterJoin method.
	 * @returns {any}
	 */
	leftOuterJoin() {
		this.getQueryBuilder().leftOuterJoin(...arguments)
		return this;
	}

	/**
	 * rightJoin method.
	 * @returns {any}
	 */
	rightJoin() {
		this.getQueryBuilder().rightJoin(...arguments)
		return this;
	}

	/**
	 * rightOuterJoin method.
	 * @returns {any}
	 */
	rightOuterJoin() {
		this.getQueryBuilder().rightOuterJoin(...arguments)
		return this;
	}

	/**
	 * fullOuterJoin method.
	 * @returns {any}
	 */
	fullOuterJoin() {
		this.getQueryBuilder().fullOuterJoin(...arguments)
		return this;
	}

	/**
	 * crossJoin method.
	 * @returns {any}
	 */
	crossJoin() {
		this.getQueryBuilder().crossJoin(...arguments)
		return this;
	}

	/**
	 * join method.
	 * @returns {any}
	 */
	join() {
		this.getQueryBuilder().join(...arguments)
		return this;
	}

	/**
	 * joinRaw method.
	 * @returns {any}
	 */
	joinRaw() {
		this.getQueryBuilder().joinRaw(...arguments)
		return this;
	}

	/**
	 * onIn method.
	 * @returns {any}
	 */
	onIn() {
		this.getQueryBuilder().onIn(...arguments)
		return this;
	}

	/**
	 * onNotIn method.
	 * @returns {any}
	 */
	onNotIn() {
		this.getQueryBuilder().onNotIn(...arguments)
		return this;
	}

	/**
	 * onNull method.
	 * @returns {any}
	 */
	onNull() {
		this.getQueryBuilder().onNull(...arguments)
		return this;
	}

	/**
	 * onNotNull method.
	 * @returns {any}
	 */
	onNotNull() {
		this.getQueryBuilder().onNotNull(...arguments)
		return this;
	}

	/**
	 * onExists method.
	 * @returns {any}
	 */
	onExists() {
		this.getQueryBuilder().onExists(...arguments)
		return this;
	}

	/**
	 * onNotExists method.
	 * @returns {any}
	 */
	onNotExists() {
		this.getQueryBuilder().onNotExists(...arguments)
		return this;
	}

	/**
	 * onBetween method.
	 * @returns {any}
	 */
	onBetween() {
		this.getQueryBuilder().onBetween(...arguments)
		return this;
	}

	/**
	 * onNotBetween method.
	 * @returns {any}
	 */
	onNotBetween() {
		this.getQueryBuilder().onNotBetween(...arguments)
		return this;
	}

	/**
	 * having method.
	 * @returns {any}
	 */
	having() {
		this.getQueryBuilder().having(...arguments)
		return this;
	}

	/**
	 * havingIn method.
	 * @returns {any}
	 */
	havingIn() {
		this.getQueryBuilder().havingIn(...arguments)
		return this;
	}

	/**
	 * havingNotIn method.
	 * @returns {any}
	 */
	havingNotIn() {
		this.getQueryBuilder().havingNotIn(...arguments)
		return this;
	}

	/**
	 * havingNull method.
	 * @returns {any}
	 */
	havingNull() {
		this.getQueryBuilder().havingNull(...arguments)
		return this;
	}

	/**
	 * havingNotNull method.
	 * @returns {any}
	 */
	havingNotNull() {
		this.getQueryBuilder().havingNotNull(...arguments)
		return this;
	}

	/**
	 * havingExists method.
	 * @returns {any}
	 */
	havingExists() {
		this.getQueryBuilder().havingExists(...arguments)
		return this;
	}

	/**
	 * havingNotExists method.
	 * @returns {any}
	 */
	havingNotExists() {
		this.getQueryBuilder().havingNotExists(...arguments)
		return this;
	}

	/**
	 * havingBetween method.
	 * @returns {any}
	 */
	havingBetween() {
		this.getQueryBuilder().havingBetween(...arguments)
		return this;
	}

	/**
	 * havingNotBetween method.
	 * @returns {any}
	 */
	havingNotBetween() {
		this.getQueryBuilder().havingNotBetween(...arguments)
		return this;
	}

	/**
	 * havingRaw method.
	 * @returns {any}
	 */
	havingRaw() {
		this.getQueryBuilder().havingRaw(...arguments)
		return this;
	}

	/**
	 * clearSelect method.
	 * @returns {any}
	 */
	clearSelect() {
		this.getQueryBuilder().clearSelect(...arguments)
		return this;
	}

	/**
	 * clearWhere method.
	 * @returns {any}
	 */
	clearWhere() {
		this.getQueryBuilder().clearWhere(...arguments)
		return this;
	}

	/**
	 * clearOrder method.
	 * @returns {any}
	 */
	clearOrder() {
		this.getQueryBuilder().clearOrder(...arguments)
		return this;
	}

	/**
	 * clearHaving method.
	 * @returns {any}
	 */
	clearHaving() {
		this.getQueryBuilder().clearHaving(...arguments)
		return this;
	}

	/**
	 * clearCounters method.
	 * @returns {any}
	 */
	clearCounters() {
		this.getQueryBuilder().clearCounters(...arguments)
		return this;
	}

	/**
	 * distinct method.
	 * @returns {any}
	 */
	distinct() {
		this.getQueryBuilder().distinct(...arguments)
		return this;
	}

	/**
	 * groupBy method.
	 * @returns {any}
	 */
	groupBy() {
		this.getQueryBuilder().groupBy(...arguments)
		return this;
	}

	/**
	 * groupByRaw method.
	 * @returns {any}
	 */
	groupByRaw() {
		this.getQueryBuilder().groupByRaw(...arguments)
		return this;
	}

	/**
	 * orderBy method.
	 * @returns {any}
	 */
	orderBy(...args: any[]) {
		this.getQueryBuilder().orderBy(...args)
		return this;
	}

	/**
	 * orderByRaw method.
	 * @returns {any}
	 */
	orderByRaw() {
		this.getQueryBuilder().orderByRaw(...arguments)
		return this;
	}

	/**
	 * offset method.
	 * @returns {any}
	 */
	offset(...args: any[]) {
		this.getQueryBuilder().offset(...args)
		return this;
	}

	/**
	 * limit method.
	 * @returns {any}
	 */
	limit(...args: any[]) {
		this.getQueryBuilder().limit(...args)
		return this;
	}

	/**
	 * union method.
	 * @returns {any}
	 */
	union() {
		this.getQueryBuilder().union(...arguments)
		return this;
	}

	/**
	 * unionAll method.
	 * @returns {any}
	 */
	unionAll() {
		this.getQueryBuilder().unionAll(...arguments)
		return this;
	}

	/**
	 * batchInsert method.
	 * @returns {any}
	 */
	batchInsert() {
		this.getQueryBuilder().batchInsert(...arguments)
		return this;
	}

	/**
	 * returning method.
	 * @returns {any}
	 */
	returning() {
		this.getQueryBuilder().havingBetween(...arguments)
		return this;
	}

	/**
	 * transacting method.
	 * @returns {any}
	 */
	transacting() {
		this.getQueryBuilder().transacting(...arguments)
		return this;
	}

	/**
	 * forUpdate method.
	 * @returns {any}
	 */
	forUpdate() {
		this.getQueryBuilder().forUpdate(...arguments)
		return this;
	}

	/**
	 * forShare method.
	 * @returns {any}
	 */
	forShare() {
		this.getQueryBuilder().forShare(...arguments)
		return this;
	}

	/**
	 * skipLocked method.
	 * @returns {any}
	 */
	skipLocked() {
		this.getQueryBuilder().skipLocked(...arguments)
		return this;
	}

	/**
	 * noWait method.
	 * @returns {any}
	 */
	noWait() {
		this.getQueryBuilder().noWait(...arguments)
		return this;
	}

	/**
	 * clone method.
	 * @returns {any}
	 */
	clone() {
		return this.getQueryBuilder().clone(...arguments)
	}

	/**
	 * modify method.
	 * @returns {any}
	 */
	modify() {
		return this.getQueryBuilder().modify(...arguments)
	}

	/**
	 * columnInfo method.
	 * @returns {any}
	 */
	columnInfo() {
		return this.getQueryBuilder().columnInfo(...arguments)
	}

	/**
	 * queryContext method.
	 * @returns {any}
	 */
	queryContext() {
		this.getQueryBuilder().queryContext(...arguments)
		return this
	}

	/**
	 * query method.
	 * @returns {any}
	 */
	query() {
		this.getQueryBuilder().query(...arguments)
		return this
	}

	/**
	 * select method.
	 * @returns {any}
	 */
	select() {
		this.getQueryBuilder().select(...arguments)
		return this
	}

	/**
	 * as method.
	 * @returns {any}
	 */
	as() {
		this.getQueryBuilder().as(...arguments)
		return this
	}

	/**
	 * column method.
	 * @returns {any}
	 */
	column() {
		this.getQueryBuilder().column(...arguments)
		return this
	}

	/**
	 * getQueryBuilder method.
	 * @returns {any}
	 */
	getQueryBuilder() {
		return this.$query?.$query || this.getQuery()
	}

	/**
	 * getQuery method.
	 * @returns {any}
	 */
	getQuery() {
		return this.$query
	}

	/**
	 * skip method.
	 * @returns {any}
	 */
	skip(...args: any[]) {
		return this.offset(...args)
	}

	/**
	 * take method.
	 * @returns {any}
	 */
	take(...args: any[]) {
		return this.limit(...args)
	}

	/**
	 * toSQL method.
	 * @returns {any}
	 */
	toSQL() {
		return this.getQueryBuilder().toSQL()
	}

	/**
	 * toSql method.
	 * @returns {any}
	 */
	toSql() {
		return this.toSQL()
	}

	/**
	 * newQuery method.
	 * @returns {any}
	 */
	newQuery() {
		return new (this.constructor as any)();
	}

	/**
	 * addWhereExistsQuery method.
	 * @param {*} $query
	 * @param {*} $boolean
	 * @param {*} $not
	 * @returns {any}
	 */
	addWhereExistsQuery($query, $boolean = 'and', $not = false) {
		let $type = $not ? 'NotExists' : 'Exists';
		let querytype = ($boolean == 'and' ? 'where' : 'orWhere') + $type
		this[querytype]($query);
		return this;
	}

	/**
	 * updateOrInsert method.
	 * @param {*} whereObj
	 * @param {*} updateObj
	 * @returns {any}
	 */
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

	/**
	 * latest method.
	 * @param {*} column
	 * @returns {any}
	 */
	latest(column = 'id') {
		this.getQueryBuilder().orderBy(column, 'desc');
		return this;
	}

	/**
	 * oldest method.
	 * @param {*} column
	 * @returns {any}
	 */
	oldest(column = 'id') {
		this.getQueryBuilder().orderBy(column, 'asc');
		return this;
	}

	/**
	 * value method.
	 * @param {*} key
	 * @returns {any}
	 */
	value(key) {
		return this.first(key).then(res => (res) ? (res[key] || null) : null)
	}

	/**
	 * first method.
	 * @param {*} select
	 * @returns {any}
	 */
	first(...select) {
		if (select[0] instanceof Array) {
			select = select[0]
		}
		return this.getQueryBuilder().first(select)
	}
	/**
	 * last method.
	 * @param {*} select
	 * @returns {any}
	 */
	last(...select) {
		this.orderBy('id', 'desc')
		return this.first(select)
	}

	/**
	 * get method.
	 * @returns {any}
	 */
	get() {
		return this.getQueryBuilder()
	}

	/**
	 * insert method.
	 * @param {*} args
	 * @returns {any}
	 */
	insert(...args) {
		return this.getQueryBuilder().insert(...args);
	}

	/**
	 * update method.
	 * @param {*} args
	 * @returns {any}
	 */
	update(...args) {
		return this.getQueryBuilder().update(...args);
	}

	/**
	 * delete method.
	 * @param {*} args
	 * @returns {any}
	 */
	delete(...args) {
		return this.getQueryBuilder().delete(...args);
	}

	/**
	 * truncate method.
	 * @returns {any}
	 */
	truncate() {
		return this.getQueryBuilder().truncate();
	}

	/**
	 * count method.
	 * @async
	 * @param {*} args
	 * @returns {any}
	 */
	async count(...args) {
		const res = await this.getQueryBuilder().count(...args);
		if (!res || !res.length) return 0;
		const val = Object.values(res[0])[0];
		return Number(val) || 0;
	}

	/**
	 * min method.
	 * @param {*} args
	 * @returns {any}
	 */
	min(...args) {
		return this.getQueryBuilder().min(...args);
	}

	/**
	 * max method.
	 * @param {*} args
	 * @returns {any}
	 */
	max(...args) {
		return this.getQueryBuilder().max(...args);
	}

	/**
	 * sum method.
	 * @param {*} args
	 * @returns {any}
	 */
	sum(...args) {
		return this.getQueryBuilder().sum(...args);
	}

	/**
	 * avg method.
	 * @param {*} args
	 * @returns {any}
	 */
	avg(...args) {
		return this.getQueryBuilder().avg(...args);
	}

	/**
	 * pluck method.
	 * @param {*} args
	 * @returns {any}
	 */
	pluck(...args) {
		return this.getQueryBuilder().pluck(...args);
	}

	/**
	 * increment method.
	 * @param {*} args
	 * @returns {any}
	 */
	increment(...args) {
		return this.getQueryBuilder().increment(...args);
	}

	/**
	 * decrement method.
	 * @param {*} args
	 * @returns {any}
	 */
	decrement(...args) {
		return this.getQueryBuilder().decrement(...args);
	}

	/**
	 * exists method.
	 * @async
	 * @returns {any}
	 */
	async exists() {
		const count = await this.count();
		return Boolean(count);
	}

	/**
	 * doesntExist method.
	 * @async
	 * @returns {any}
	 */
	async doesntExist() {
		return !(await this.exists());
	}

	/**
	 * forPage method.
	 * @param {*} $page
	 * @param {*} $perPage
	 * @returns {any}
	 */
	forPage($page = 1, $perPage) {
		$page = ($page - 1) * $perPage
		return this.offset($page).limit($perPage)
	}

	/**
	 * collection method.
	 * @returns {any}
	 */
	collection() {
		return this.getQueryBuilder().then(res => new Collection(res))
	}

	/**
	 * request method.
	 * @param {*} request
	 * @returns {any}
	 */
	request(request) {
		Object.defineProperty(this, '$request', { value: request });
		return this
	}

	/**
	 * paginate method.
	 * @async
	 * @param {*} $perPage
	 * @param {*} $pageName
	 * @param {*} $page
	 * @param {*} $total
	 * @returns {any}
	 */
	async paginate($perPage = 15, $pageName = 'page', $page = null, $total = null) {

		$page = parseInt($page || (this.$request ? this.$request.input($pageName, 1) : 1));
		if ($total === null || $total === undefined) {
			const countQuery = new (this.constructor as any)(this.$connection, this.$grammar, this.getQueryBuilder().clone());
			$total = await countQuery.count();
		}
		$perPage = typeof $perPage == 'function' ? ($perPage as Function)($total) : $perPage;
		const $results = $total ? await this.forPage($page, $perPage).get() : new Collection([]);

		return this.paginator($results, $total, $perPage, $page, {
			"$path": this.$request ? this.$request.path() : '/',
			'$pageName': $pageName,
		});
	}

	/**
	 * simplePaginate method.
	 * @async
	 * @param {*} $perPage
	 * @param {*} $page
	 * @param {*} $pageName
	 * @returns {any}
	 */
	async simplePaginate($perPage: any = 15, $page: any = 1, $pageName: string = 'page') {

		$page = parseInt($page || (this.$request ? this.$request.input($pageName, 1) : 1));
		this.offset(($page - 1) * $perPage).limit($perPage + 1);
		return this.simplePaginator(await this.get(), $perPage, $page, {
			"$path": this.$request ? this.$request.path() : '/',
			'$pageName': $pageName,
		});
	}

	protected paginator($items: any, $total: any, $perPage: any, $currentPage: any, $option: any) {
		return new LengthAwarePaginator($items, $total, $perPage, $currentPage, $option, this.$request);
	}

	protected simplePaginator($items: any, $perPage: any, $currentPage: any, $option: any) {
		return new Paginator($items, $perPage, $currentPage, $option, this.$request);
	}

}

export default Builder;

