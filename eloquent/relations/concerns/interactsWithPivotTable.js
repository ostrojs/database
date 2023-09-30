const Model = require('@ostro/contracts/database/eloquent/model')
const Collection = require('../../collection')
const BaseCollection = require('@ostro/contracts/collection/collect');
const { is_object } = require('@ostro/support/function');
class InteractsWithPivotTable {
    toggle($ids, $touch = true) {
        const $changes = {
            'attached': [],
            'detached': [],
        };

        let $records = this.formatRecordsList(this.parseIds($ids));

        let $detach = Object.values(Object.keys($records).intersection(
            this.newPivotQuery().pluck(this.$relatedPivotKey).all()

        ));

        if (count($detach) > 0) {
            this.detach($detach, false);

            $changes['detached'] = this.castKeys($detach);
        }

        let $attach = $detach.intersection(Object.keys($records));

        if (count($attach) > 0) {
            this.attach($attach, [], false);

            $changes['attached'] = $attach
        }

        if ($touch && (count($changes['attached']) ||
            count($changes['detached']))) {
            this.touchIfTouching();
        }

        return $changes;
    }

    syncWithoutDetaching($ids) {
        return this.sync($ids, false);
    }

    sync($ids, $detaching = true) {
        let $changes = {
            'attached': [],
            'detached': [],
            'updated': [],
        }

        let $current = this.getCurrentlyAttachedPivots()
            .pluck(this.$relatedPivotKey).all();
        let $records = this.formatRecordsList(this.parseIds($ids))
        let $detach = $current.intersection(Object.keys($records));

        if ($detaching && count($detach) > 0) {
            this.detach($detach);

            $changes['detached'] = this.castKeys($detach);
        }

        $changes = $changes.concat(this.attachNew($records, $current, false));

        if (count($changes['attached']) ||
            count($changes['updated']) ||
            count($changes['detached'])) {
            this.touchIfTouching();
        }

        return $changes;
    }

    syncWithPivotValues($ids, $values, $detaching = true) {
        return this.sync(collect(this.parseIds($ids)).mapWithKeys(function ($id) {
            return { [$id]: $values };
        }), $detaching);
    }

    formatRecordsList($records) {
        return collect($records).mapWithKeys(function ($attributes, $id) {
            if (!is_array($attributes)) {
                [$id, $attributes] = [$attributes, []];
            }

            return [$id => $attributes];
        }).all();
    }

    attachNew($records = {}, $current, $touch = true) {
        const $changes = { 'attached': [], 'updated': [] };
        for ($id in $records) {
            const $attributes = $records[$id]
            if (!in_array($id, $current)) {
                this.attach($id, $attributes, $touch);

                $changes['attached'].push(this.castKey($id));
            }
            else if (count($attributes) > 0 &&
                this.updateExistingPivot($id, $attributes, $touch)) {
                $changes['updated'].push(this.castKey($id));
            }
        }
        return $changes;
    }

    updateExistingPivot($id, $attributes, $touch = true) {
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

    async updateExistingPivotUsingCustomClass($id, $attributes, $touch) {
        const $pivot = await this.getCurrentlyAttachedPivots()
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

    attach($id = [], $attributes = {}, $touch = true) {
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
        this.$parent.setLazyQuery(fn)
    }

    attachUsingCustomClass($id, $attributes) {
        let $records = this.formatAttachRecords(
            this.parseIds($id), $attributes
        );
        let p = []
        for (let $record of $records) {
            p.push(this.newPivot($record, false).save());
        }
        return Promise.all(p)

    }

    formatAttachRecords($ids, $attributes) {
        const $records = [];

        let $hasTimestamps = (this.hasPivotColumn(this.createdAt()) ||
            this.hasPivotColumn(this.updatedAt()));
        for (let $id of $ids) {
            $records.push(this.formatAttachRecord(
                this.$relatedKey, $id, $attributes, $hasTimestamps
            ));
        }

        return $records;
    }

    formatAttachRecord($key, $value, $attributes, $hasTimestamps) {
        var [$id, $attributes] = this.extractAttachIdAndAttributes($key, $value, $attributes);

        return Object.assign(
            this.baseAttachRecord($id, $hasTimestamps), this.castAttributes($attributes)
        );
    }

    extractAttachIdAndAttributes($key, $value, $attributes) {
        return is_object($value) ?
            [$key, Object.assign($value, $attributes)] :
            [$value, $attributes];
    }

    baseAttachRecord($id, $timed) {
        let $record = {}
        $record[this.$relatedPivotKey] = $id;

        $record[this.$foreignPivotKey] = this.$parent[this.$parentKey];

        if ($timed) {
            $record = this.addTimestampsToAttachment($record);
        }
        return $record;
    }

    addTimestampsToAttachment($record, $exists = false) {
        let $fresh = this.$parent.freshTimestamp();

        if (this.$using) {
            const $pivotModel = new this.$using;

            $fresh = $fresh.format($pivotModel.getDateFormat());
        }

        if (!$exists && this.hasPivotColumn(this.createdAt())) {
            $record[this.createdAt()] = $fresh;
        }

        if (this.hasPivotColumn(this.updatedAt())) {
            $record[this.updatedAt()] = $fresh;
        }

        return $record;
    }

    hasPivotColumn($column) {
        return in_array($column, this.$pivotColumns);
    }

    detach($ids = null, $touch = true) {
        if (this.$using &&
            !empty($ids) &&
            empty(this.$pivotWheres) &&
            empty(this.$pivotWhereIns) &&
            empty(this.$pivotWhereNulls)) {
            $results = this.detachUsingCustomClass($ids);
        } else {
            $query = this.newPivotQuery();

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

    detachUsingCustomClass($ids) {
        $results = 0;

        for (let $id of this.parseIds($ids)) {
            $results += this.newPivot({
                [this.$foreignPivotKey]: this.$parent[this.$parentKey],
                [this.$relatedPivotKey]: $id,
            }, true).delete();
        }

        return $results;
    }

    getCurrentlyAttachedPivots() {
        return this.newPivotQuery().get().map(function ($record) {
            const $class = this.$using || Pivot;

            $pivot = $class.fromRawAttributes(this.$parent, $record, this.getTable(), true);

            return $pivot.setPivotKeys(this.$foreignPivotKey, this.$relatedPivotKey);
        });
    }

    newPivot($attributes = [], $exists = false) {
        const $pivot = this.$related.newPivot(
            this.$parent, $attributes, this.$table, $exists, this.$using
        );

        return $pivot.setPivotKeys(this.$foreignPivotKey, this.$relatedPivotKey);
    }

    newExistingPivot($attributes = []) {
        return this.newPivot($attributes, true);
    }

    newPivotStatement() {
        return this.newQuery().getQuery().from(this.$table);
    }

    newPivotStatementForId($id) {
        return this.newPivotQuery().whereIn(this.$relatedPivotKey, this.parseIds($id));
    }

    newPivotQuery() {
        $query = this.newPivotStatement();

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

    withPivot($columns) {
        this.$pivotColumns = this.$pivotColumns.concat(
            this.$pivotColumns, Array.isArray($columns) ? $columns : arguments
        );

        return this;
    }

    parseIds($value) {
        if ($value instanceof Model) {
            return [$value[this.$relatedKey]];
        }

        if ($value instanceof Collection) {
            return $value.pluck(this.$relatedKey).all();
        }

        if ($value instanceof BaseCollection) {
            return $value.toArray();
        }

        return $value;
    }

    parseId($value) {
        return $value instanceof Model ? $value[this.$relatedKey] : $value;
    }

    castKeys($keys) {
        return $keys.map(function ($v) {
            return this.castKey($v);
        });
    }

    castKey($key) {
        return this.getTypeSwapValue(
            this.$related.getKeyType(),
            $key
        );
    }

    castAttributes($attributes) {
        return this.$using ?
            this.newPivot().fill($attributes).getAttributes() :
            $attributes;
    }

    getTypeSwapValue($type, $value) {
        switch (strtolower($type)) {
            case 'int':
            case 'integer':
                return $value;
            case 'real':
            case 'float':
            case 'double':
                return $value;
            case 'string':
                return $value.toString();
            default:
                return $value;
        }
    }
}
module.exports = InteractsWithPivotTable
