import Model from '@ostro/contracts/database/eloquent/model';
import Collection from '../../collection';
import Pivot from '../pivot';
import BaseCollection from '@ostro/contracts/collection/collect';
import { is_object, empty, count, is_null, in_array, collect } from '@ostro/support/function';
import { lower } from '@ostro/support/string';
import { intersection, difference } from 'lodash';
/**
 * Class InteractsWithPivotTable.
 */
class InteractsWithPivotTable {
    [key: string]: any;
    /**
     * toggle method.
     * @async
     * @param {*} $ids
     * @param {*} $touch
     * @returns {any}
     */
    public async toggle($ids: any, $touch: boolean = true) {
        const $changes = {
            'attached': [],
            'detached': [],
        };

        let $records = this.formatRecordsList(this.parseIds($ids));
        let pivotKeys = await this.newPivotQuery().pluck(this.$relatedPivotKey);
        let rawCurrent = Array.isArray(pivotKeys) ? pivotKeys : (pivotKeys.all ? pivotKeys.all() : []);
        let currentAttached = rawCurrent.map(String);
        let recordKeys = Object.keys($records).map(String);

        let $detach = intersection(recordKeys, currentAttached);

        if (count($detach) > 0) {
            await this.detach($detach, false);

            $changes['detached'] = this.castKeys($detach);
        }

        let $attach = difference(recordKeys, currentAttached);

        if (count($attach) > 0) {
            await this.attach($attach, {}, false);

            $changes['attached'] = this.castKeys($attach);
        }

        if ($touch && (count($changes['attached']) ||
            count($changes['detached']))) {
            await this.touchIfTouching();
        }

        return $changes;
    }

    /**
     * syncWithoutDetaching method.
     * @param {*} $ids
     * @returns {any}
     */
    public syncWithoutDetaching($ids: any) {
        return this.sync($ids, false);
    }

    /**
     * sync method.
     * @async
     * @param {*} $ids
     * @param {*} $detaching
     * @returns {any}
     */
    public async sync($ids: any, $detaching: boolean = true) {
        let $changes = {
            'attached': [],
            'detached': [],
            'updated': [],
        }

        let pivotRows = await this.newPivotQuery().pluck(this.$relatedPivotKey);
        let rawCurrent = Array.isArray(pivotRows) ? pivotRows : (pivotRows.all ? pivotRows.all() : []);
        let $current = rawCurrent.map(String);
        let $records = this.formatRecordsList(this.parseIds($ids));
        let recordKeys = Object.keys($records).map(String);

        let $detach = difference($current, recordKeys);

        if ($detaching && count($detach) > 0) {
            await this.detach($detach);

            $changes['detached'] = this.castKeys($detach);
        }

        let newChanges = await this.attachNew($records, $current, false);
        $changes['attached'] = newChanges['attached'] || [];
        $changes['updated'] = newChanges['updated'] || [];

        if (count($changes['attached']) ||
            count($changes['updated']) ||
            count($changes['detached'])) {
            await this.touchIfTouching();
        }

        return $changes;
    }

    /**
     * syncWithPivotValues method.
     * @param {*} $ids
     * @param {*} $values
     * @param {*} $detaching
     * @returns {any}
     */
    public syncWithPivotValues($ids: any, $values: Record<string, any>, $detaching: boolean = true) {
        let records = {};
        for (let id of this.parseIds($ids)) {
            records[id] = $values;
        }
        return this.sync(records, $detaching);
    }

    /**
     * formatRecordsList method.
     * @param {*} $records
     * @returns {any}
     */
    public formatRecordsList($records: any) {
        let result = {};
        if (Array.isArray($records)) {
            for (let id of $records) {
                result[id] = {};
            }
        } else if (typeof $records === 'object' && $records !== null) {
            for (let [id, attrs] of Object.entries($records)) {
                result[id] = (Array.isArray(attrs) || typeof attrs === 'object') ? attrs : {};
            }
        }
        return result;
    }

    /**
     * attachNew method.
     * @async
     * @param {*} $records
     * @param {*} $current
     * @param {*} $touch
     * @returns {any}
     */
    public async attachNew($records: Record<string, any> = {}, $current: any, $touch: boolean = true) {
        const $changes = { 'attached': [], 'updated': [] };
        const currentStrings = (Array.isArray($current) ? $current : []).map(String);
        for (let $id in $records) {
            const $attributes = $records[$id];
            if (!in_array(String($id), currentStrings)) {
                await this.attach($id, $attributes, $touch);

                $changes['attached'].push(this.castKey($id));
            }
            else if (count($attributes) > 0 &&
                await this.updateExistingPivot($id, $attributes, $touch)) {
                $changes['updated'].push(this.castKey($id));
            }
        }
        return $changes;
    }

    /**
     * updateExistingPivot method.
     * @param {*} $id
     * @param {*} $attributes
     * @param {*} $touch
     * @returns {any}
     */
    public updateExistingPivot($id: string, $attributes: Record<string, any>, $touch: boolean = true) {
        if (this.$using &&
            empty(this.$pivotWheres) &&
            empty(this.$pivotWhereIns) &&
            empty(this.$pivotWhereNulls)) {
            return this.updateExistingPivotUsingCustomClass($id, $attributes, $touch);
        }

        if (in_array(this.updatedAt(), this.$pivotColumns)) {
            $attributes = this.addTimestampsToAttachment($attributes, true);
        }

        const $updated = this.newPivotStatementForId(this.parseId($id)).update(
            this.castAttributes($attributes)
        );

        if ($touch) {
            this.touchIfTouching();
        }

        return $updated;
    }

    /**
     * updateExistingPivotUsingCustomClass method.
     * @async
     * @param {*} $id
     * @param {*} $attributes
     * @param {*} $touch
     * @returns {any}
     */
    public async updateExistingPivotUsingCustomClass($id: string, $attributes: Record<string, any>, $touch: any) {
        const attachedPivots = await this.getCurrentlyAttachedPivots();
        const $pivot = attachedPivots
            .where(this.$foreignPivotKey, this.$parent[this.$parentKey])
            .where(this.$relatedPivotKey, this.parseId($id))
            .first();

        const $updated = $pivot ? $pivot.fill($attributes).isDirty() : false;

        if ($updated) {
            await $pivot.save();
        }

        if ($touch) {
            this.touchIfTouching();
        }

        return $updated;
    }

    /**
     * attach method.
     * @param {*} $id
     * @param {*} $attributes
     * @param {*} $touch
     * @returns {any}
     */
    public attach($id: any = [], $attributes: Record<string, any> = {}, $touch: boolean = true) {
        const fn = async () => {
            if (this.$using) {
                await this.attachUsingCustomClass($id, $attributes);
            } else {
                await this.newPivotStatement().insert(this.formatAttachRecords(
                    this.parseIds($id), $attributes
                ));
            }

            if ($touch) {
                this.touchIfTouching();
            }
        };
        if (this.$parent.$exists) {
            return fn();
        }
        this.$parent.setLazyQuery(fn);
    }

    /**
     * attachUsingCustomClass method.
     * @param {*} $id
     * @param {*} $attributes
     * @returns {any}
     */
    public attachUsingCustomClass($id: any, $attributes: Record<string, any>) {
        let $records = this.formatAttachRecords(
            this.parseIds($id), $attributes
        );
        let p = []
        for (let $record of $records) {
            p.push(this.newPivot($record, false).save());
        }
        return Promise.all(p)

    }

    /**
     * formatAttachRecords method.
     * @param {*} $ids
     * @param {*} $attributes
     * @returns {any}
     */
    public formatAttachRecords($ids: any, $attributes: Record<string, any>) {
        const $records = [];

        let $hasTimestamps = (this.hasPivotColumn(this.createdAt()) ||
            this.hasPivotColumn(this.updatedAt()));
        for (let $id of $ids) {
            $records.push(this.formatAttachRecord(
                $id, $attributes, $hasTimestamps
            ));
        }

        return $records;
    }

    /**
     * formatAttachRecord method.
     * @param {*} $id
     * @param {*} $attributes
     * @param {*} $hasTimestamps
     * @returns {any}
     */
    public formatAttachRecord($id: string, $attributes: Record<string, any>, $hasTimestamps: boolean) {
        return Object.assign(
            this.baseAttachRecord($id, $hasTimestamps), this.castAttributes($attributes)
        );
    }

    /**
     * extractAttachIdAndAttributes method.
     * @param {*} $key
     * @param {*} $value
     * @param {*} $attributes
     * @returns {any}
     */
    public extractAttachIdAndAttributes($key: string, $value: any, $attributes: Record<string, any>) {
        return is_object($value) ?
            [$key, Object.assign($value, $attributes)] :
            [$value, $attributes];
    }

    /**
     * baseAttachRecord method.
     * @param {*} $id
     * @param {*} $timed
     * @returns {any}
     */
    public baseAttachRecord($id: string, $timed: any) {
        let $record = {}
        $record[this.$relatedPivotKey] = $id;

        $record[this.$foreignPivotKey] = this.$parent[this.$parentKey];

        if ($timed) {
            $record = this.addTimestampsToAttachment($record);
        }
        return $record;
    }

    /**
     * addTimestampsToAttachment method.
     * @param {*} $record
     * @param {*} $exists
     * @returns {any}
     */
    public addTimestampsToAttachment($record: any, $exists: boolean = false) {
        let $fresh = this.$parent.freshTimestampString();

        if (this.$using) {
            const $pivotModel = new this.$using;

            $fresh = $fresh.format ? $fresh.format($pivotModel.getDateFormat()) : $fresh;
        }

        if (!$exists && this.hasPivotColumn(this.createdAt())) {
            $record[this.createdAt()] = $fresh;
        }

        if (this.hasPivotColumn(this.updatedAt())) {
            $record[this.updatedAt()] = $fresh;
        }

        return $record;
    }

    /**
     * hasPivotColumn method.
     * @param {*} $column
     * @returns {any}
     */
    public hasPivotColumn($column: string) {
        return in_array($column, this.$pivotColumns);
    }

    /**
     * detach method.
     * @param {*} $ids
     * @param {*} $touch
     * @returns {any}
     */
    public detach($ids: any = null, $touch: boolean = true) {
        let $results = 0;
        if (this.$using &&
            !empty($ids) &&
            empty(this.$pivotWheres) &&
            empty(this.$pivotWhereIns) &&
            empty(this.$pivotWhereNulls)) {
            $results = this.detachUsingCustomClass($ids);
        } else {
            let $query = this.newPivotQuery();

            if (!is_null($ids)) {
                $ids = this.parseIds($ids);

                if (empty($ids)) {
                    return 0;
                }

                $query.whereIn(this.getQualifiedRelatedPivotKeyName(), $ids);
            }

            $results = $query.delete();
        }

        if ($touch) {
            this.touchIfTouching();
        }

        return $results;
    }

    /**
     * detachUsingCustomClass method.
     * @param {*} $ids
     * @returns {any}
     */
    public detachUsingCustomClass($ids: any) {
        let $results = 0;

        for (let $id of this.parseIds($ids)) {
            $results += this.newPivot({
                [this.$foreignPivotKey]: this.$parent[this.$parentKey],
                [this.$relatedPivotKey]: $id,
            }, true).delete();
        }

        return $results;
    }

    /**
     * getCurrentlyAttachedPivots method.
     * @async
     * @returns {any}
     */
    public async getCurrentlyAttachedPivots() {
        const records = await this.newPivotQuery().get();
        return collect(records.map(($record) => {
            const $class = this.$using || Pivot;

            let $pivot = $class.fromRawAttributes(this.$parent, $record, this.getTable(), true);

            return $pivot.setPivotKeys(this.$foreignPivotKey, this.$relatedPivotKey);
        }));
    }

    /**
     * newPivot method.
     * @param {*} $attributes
     * @param {*} $exists
     * @returns {any}
     */
    public newPivot($attributes: any = [], $exists: boolean = false) {
        const $pivot = this.$related.newPivot(
            this.$parent, $attributes, this.$table, $exists, this.$using
        );

        return $pivot.setPivotKeys(this.$foreignPivotKey, this.$relatedPivotKey);
    }

    /**
     * newExistingPivot method.
     * @param {*} $attributes
     * @returns {any}
     */
    public newExistingPivot($attributes: any[] = []) {
        return this.newPivot($attributes, true);
    }

    /**
     * newPivotStatement method.
     * @returns {any}
     */
    public newPivotStatement() {
        return this.newQuery().getQuery().from(this.$table);
    }

    /**
     * newPivotStatementForId method.
     * @param {*} $id
     * @returns {any}
     */
    public newPivotStatementForId($id: string) {
        return this.newPivotQuery().whereIn(this.$relatedPivotKey, this.parseIds($id));
    }

    /**
     * newPivotQuery method.
     * @returns {any}
     */
    public newPivotQuery() {
        let $query = this.newPivotStatement();

        for (let $arguments of this.$pivotWheres) {
            $query.where(...$arguments);
        }

        for (let $arguments of this.$pivotWhereIns) {
            $query.whereIn(...$arguments);
        }

        for (let $arguments of this.$pivotWhereNulls) {
            $query.whereNull(...$arguments);
        }

        return $query.where(this.getQualifiedForeignPivotKeyName(), this.$parent[this.$parentKey]);
    }

    /**
     * withPivot method.
     * @param {*} $columns
     * @returns {any}
     */
    public withPivot($columns: any[]) {
        this.$pivotColumns = this.$pivotColumns.concat(
            Array.isArray($columns) ? $columns : [...arguments]
        );

        return this;
    }

    /**
     * parseIds method.
     * @param {*} $value
     * @returns {any}
     */
    public parseIds($value: any) {
        if ($value instanceof Model) {
            return [$value[this.$relatedKey]];
        }

        if ($value instanceof Collection || (typeof $value?.pluck === 'function' && typeof $value?.all === 'function' && $value.first() instanceof Model)) {
            return $value.pluck(this.$relatedKey).all();
        }

        if ($value instanceof BaseCollection || (typeof $value?.toArray === 'function' && !Array.isArray($value))) {
            return $value.toArray();
        }

        if (typeof $value === 'object' && $value !== null && !Array.isArray($value)) {
            return $value;
        }

        return Array.isArray($value) ? $value : (is_null($value) ? [] : [$value]);
    }

    /**
     * parseId method.
     * @param {*} $value
     * @returns {any}
     */
    public parseId($value: any) {
        return $value instanceof Model ? $value[this.$relatedKey] : $value;
    }

    /**
     * castKeys method.
     * @param {*} $keys
     * @returns {any}
     */
    public castKeys($keys: any) {
        return (Array.isArray($keys) ? $keys : []).map(($v) => {
            return this.castKey($v);
        });
    }

    /**
     * castKey method.
     * @param {*} $key
     * @returns {any}
     */
    public castKey($key: string) {
        return this.getTypeSwapValue(
            this.$related.getKeyType(),
            $key
        );
    }

    /**
     * castAttributes method.
     * @param {*} $attributes
     * @returns {any}
     */
    public castAttributes($attributes: Record<string, any>) {
        return this.$using ?
            this.newPivot().fill($attributes).getAttributes() :
            $attributes;
    }

    /**
     * getTypeSwapValue method.
     * @param {*} $type
     * @param {*} $value
     * @returns {any}
     */
    public getTypeSwapValue($type: string, $value: any) {
        switch (lower($type)) {
            case 'int':
            case 'integer':
                return parseInt($value);
            case 'real':
            case 'float':
            case 'double':
                return $value;
            case 'string':
                return String($value);
            default:
                return $value;
        }
    }
}

export default InteractsWithPivotTable;
