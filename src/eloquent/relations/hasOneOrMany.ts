import { isset, is_null } from '@ostro/support/function';
import Relation from './relation';
const kForeignKey = Symbol('foreignKey')
const kLocalKey = Symbol('localKey')
/**
 * Class HasOneOrMany.
 */
class HasOneOrMany extends Relation {

    $foreignKey = '';

    $localKey = '';

    /**
     * Create a new instance.
     * @param {*} $query
     * @param {*} $parent
     * @param {*} $foreignKey
     * @param {*} $localKey
     */
    constructor($query: any, $parent: any, $foreignKey: any, $localKey: any) {
        super($query, $parent);
        this.$localKey = $localKey;
        this.$foreignKey = $foreignKey;
        this.addConstraints();

    }

    /**
     * make method.
     * @param {*} $attributes
     * @returns {any}
     */
    public make($attributes: Record<string, any> = {}) {
        const $instance = this.$related.newInstance();
        $instance.fill($attributes);
        this.setForeignAttributesForCreate($instance);
        return $instance;
    }

    /**
     * makeMany method.
     * @param {*} $records
     * @returns {any}
     */
    public makeMany($records: any) {
        let items = [];

        for (let $record of $records) {
            items.push(this.make($record));
        }

        return this.$related.newCollection(items);
    }

    /**
     * addConstraints method.
     * @returns {any}
     */
    public addConstraints() {

        if ((this.constructor as any).$constraints) {
            let $query = this.getRelationQuery();

            $query.where(this.getQualifiedForeignKeyName(), '=', this.getParentKey());

            $query.whereNotNull(this.getQualifiedForeignKeyName());
        }
    }

    /**
     * addEagerConstraints method.
     * @param {*} $models
     * @returns {any}
     */
    public addEagerConstraints($models: any) {
        let $whereIn = this.whereInMethod(this.$parent, this.$localKey);
        return this.getRelationQuery()[$whereIn](
            this.$foreignKey, this.getKeys($models, this.$localKey).filter(res => res)
        );
    }

    /**
     * matchOne method.
     * @param {*} $models
     * @param {*} $results
     * @param {*} $relation
     * @returns {any}
     */
    public matchOne($models: any, $results: any, $relation: any) {
        return this.matchOneOrMany($models, $results, $relation, 'one');
    }

    /**
     * matchMany method.
     * @param {*} $models
     * @param {*} $results
     * @param {*} $relation
     * @returns {any}
     */
    public matchMany($models: any, $results: any, $relation: any) {
        return this.matchOneOrMany($models, $results, $relation, 'many');
    }

    /**
     * matchOneOrMany method.
     * @param {*} $models
     * @param {*} $results
     * @param {*} $relation
     * @param {*} $type
     * @returns {any}
     */
    public matchOneOrMany($models: any, $results: any, $relation: any, $type: string) {
        let $dictionary = this.buildDictionary($results);

        for (let $model of $models) {
            let $key = this.getDictionaryKey($model.getAttribute(this.$localKey))
            if (isset($dictionary[$key])) {
                $model.setRelation(
                    $relation, this.getRelationValue($dictionary, $key, $type)
                );
            }

        }

        return $models;
    }

    /**
     * getRelationValue method.
     * @param {*} $dictionary
     * @param {*} $key
     * @param {*} $type
     * @returns {any}
     */
    public getRelationValue($dictionary: any, $key: string, $type: string) {
        let $value = $dictionary[$key]
        return $type === 'one' ? ($value[0] || null) : this.$related.newCollection($value);
    }

    /**
     * buildDictionary method.
     * @param {*} $results
     * @returns {any}
     */
    public buildDictionary($results: any) {
        let $foreign = this.getForeignKeyName();
        let $res = {}
        $results.forEach(($result) => {
            let $key = this.getDictionaryKey($result[$foreign])
            if (!Array.isArray($res[$key])) {
                $res[$key] = []
            }
            $res[$key].push($result)
        });

        return $res
    }

    /**
     * findOrNew method.
     * @async
     * @param {*} $id
     * @param {*} $columns
     * @returns {any}
     */
    public async findOrNew($id: string, $columns: any[] = ['*']) {
        let $instance = await this.find($id, $columns);
        if (is_null($instance)) {
            $instance = this.$related.newInstance();

            this.setForeignAttributesForCreate($instance);
        }

        return $instance;
    }

    /**
     * firstOrNew method.
     * @async
     * @param {*} $attributes
     * @param {*} $values
     * @returns {any}
     */
    public async firstOrNew($attributes: Record<string, any> = {}, $values: Record<string, any> = {}) {
        let $instance = await this.where($attributes).first();
        if (is_null($instance)) {
            $instance = this.$related.newInstance();
            $instance.fill({ ...$attributes, ...$values });

            this.setForeignAttributesForCreate($instance);
        }

        return $instance;
    }

    /**
     * firstOrCreate method.
     * @async
     * @param {*} $attributes
     * @param {*} $values
     * @returns {any}
     */
    public async firstOrCreate($attributes: Record<string, any> = {}, $values: Record<string, any> = {}) {
        let $instance = await this.where($attributes).first();
        if (is_null($instance)) {
            $instance = await this.create({ ...$attributes, ...$values });
        }

        return $instance;
    }

    /**
     * updateOrCreate method.
     * @async
     * @param {*} $attributes
     * @param {*} $values
     * @returns {any}
     */
    public async updateOrCreate($attributes: Record<string, any>, $values: Record<string, any> = {}) {
        const $instance = await this.firstOrNew($attributes)

        $instance.fill($values);

        await $instance.save();
    }

    /**
     * save method.
     * @async
     * @param {*} $model
     * @returns {any}
     */
    public async save($model: any) {
        this.setForeignAttributesForCreate($model);

        return await $model.save() ? $model : false;
    }

    /**
     * saveMany method.
     * @async
     * @param {*} $models
     * @returns {any}
     */
    public async saveMany($models: any) {
        for (let $model of $models) {
            await this.save($model);
        }

        return $models;
    }

    /**
     * create method.
     * @async
     * @param {*} $attributes
     * @returns {any}
     */
    public async create($attributes: Record<string, any> = {}) {
        const $instance = this.$related.newInstance();
        $instance.fill($attributes);
        this.setForeignAttributesForCreate($instance);
        await $instance.save();
        return $instance;
    }

    /**
     * createMany method.
     * @async
     * @param {*} $records
     * @returns {any}
     */
    public async createMany($records: any) {
        let items = [];

        for (let $record of $records) {
            items.push(await this.create($record));
        }
        return this.$related.newCollection(items);
    }

    /**
     * setForeignAttributesForCreate method.
     * @param {*} $model
     * @returns {any}
     */
    public setForeignAttributesForCreate($model: any) {
        $model.setAttribute(this.getForeignKeyName(), this.getParentKey());
    }

    /**
     * getRelationExistenceQuery method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @param {*} $columns
     * @returns {any}
     */
    public getRelationExistenceQuery($query: any, $parentQuery: any, $columns: any[] = ['*']) {
        if ($query.getTable() == $parentQuery.getTable()) {
            return this.getRelationExistenceQueryForSelfRelation($query, $parentQuery, $columns);
        }

        return super.getRelationExistenceQuery($query, $parentQuery, $columns);
    }

    /**
     * getRelationExistenceQueryForSelfRelation method.
     * @param {*} $query
     * @param {*} $parentQuery
     * @param {*} $columns
     * @returns {any}
     */
    public getRelationExistenceQueryForSelfRelation($query: any, $parentQuery: any, $columns: any[] = ['*']) {
        let $hash = this.getRelationCountHash()
        $query.from($query.getModel().getTable() + ' as ' + $hash);

        $query.getModel().setTable($hash);

        return $query.select($columns).whereRaw(
            this.getQualifiedParentKeyName() + '=' + $hash + '.' + this.getForeignKeyName()
        );
    }

    /**
     * getExistenceCompareKey method.
     * @returns {any}
     */
    public getExistenceCompareKey() {
        return this.getQualifiedForeignKeyName();
    }

    /**
     * getParentKey method.
     * @returns {any}
     */
    public getParentKey() {
        return this.$parent.getAttribute(this.$localKey);
    }

    /**
     * getQualifiedParentKeyName method.
     * @returns {any}
     */
    public getQualifiedParentKeyName() {
        return this.$parent.qualifyColumn(this.$localKey);
    }

    /**
     * getForeignKeyName method.
     * @returns {any}
     */
    public getForeignKeyName() {
        let $segments = this.getQualifiedForeignKeyName().split('.');

        return $segments[$segments.length - 1];
    }

    /**
     * getQualifiedForeignKeyName method.
     * @returns {any}
     */
    public getQualifiedForeignKeyName() {
        return this.$foreignKey;
    }

    /**
     * getLocalKeyName method.
     * @returns {any}
     */
    public getLocalKeyName() {
        return this.$localKey;
    }
}

export default HasOneOrMany;
