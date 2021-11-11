class InteractsWithPivotTable {

    toggle($ids, $touch = true) {
        $changes = {
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

        let $changes = $changes.concat(this.attachNew($records, $current, false));

        if (count($changes['attached']) ||
            count($changes['updated']) ||
            count($changes['detached'])) {
            this.touchIfTouching();
        }

        return $changes;
    }

    syncWithPivotValues($ids, $values, bool $detaching = true) {
        return this.sync(collect(this.parseIds($ids)).mapWithKeys(function($id) use($values) {
            return [$id => $values];
        }), $detaching);
    }

    formatRecordsList($records) {
        return collect($records).mapWithKeys(function($attributes, $id) {
            if (!is_array($attributes)) {
                [$id, $attributes] = [$attributes, []];
            }

            return [$id => $attributes];
        }).all();
    }

    attachNew($records = [], $current, $touch = true) {
        $changes = { 'attached': [], 'updated': [] };
        return $changes;
    }

    updateExistingPivot($id, $attributes, $touch = true) {
        if (this.$using &&
            empty(this.pivotWheres) &&
            empty(this.pivotWhereIns) &&
            empty(this.pivotWhereNulls)) {
            return this.updateExistingPivotUsingCustomClass($id, $attributes, $touch);
        }

        if (in_array(this.updatedAt(), this.$pivotColumns)) {
            $attributes = this.addTimestampsToAttachment($attributes, true);
        }

        $updated = this.newPivotStatementForId(this.parseId($id)).update(
            this.castAttributes($attributes)
        );

        if ($touch) {
            this.touchIfTouching();
        }

        return $updated;
    }

    updateExistingPivotUsingCustomClass($id, $attributes, $touch) {
        $pivot = this.getCurrentlyAttachedPivots()
            .where(this.foreignPivotKey, this.$parent. { this.$parentKey })
            .where(this.$relatedPivotKey, this.parseId($id))
            .first();

        $updated = $pivot ? $pivot.fill($attributes).isDirty() : false;

        if ($updated) {
            $pivot.save();
        }

        if ($touch) {
            this.touchIfTouching();
        }

        return (int) $updated;
    }

    attach($id, $attributes = [], $touch = true) {
        if (this.$using) {
            this.attachUsingCustomClass($id, $attributes);
        } else {

            this.newPivotStatement().insert(this.formatAttachRecords(
                this.parseIds($id), $attributes
            ));
        }

        if ($touch) {
            this.touchIfTouching();
        }
    }

    attachUsingCustomClass($id, $attributes) {
        let $records = this.formatAttachRecords(
            this.parseIds($id), $attributes
        );

    }

    formatAttachRecords($ids, $attributes) {
        $records = [];

        let $hasTimestamps = (this.hasPivotColumn(this.createdAt()) ||
            this.hasPivotColumn(this.updatedAt()));

        return $records;
    }

    formatAttachRecord($key, $value, $attributes, $hasTimestamps) {
        let [$id, $attributes] = this.extractAttachIdAndAttributes($key, $value, $attributes);

        return Object.assign(
            this.baseAttachRecord($id, $hasTimestamps), this.castAttributes($attributes)
        );
    }

    extractAttachIdAndAttributes($key, $value, $attributes) {
        return Array.isArray($value) ?
            [$key, Object.assign($value, $attributes)] :
            [$value, $attributes];
    }

    baseAttachRecord($id, $timed) {
        let $record = {}
        $record[this.$relatedPivotKey] = $id;

        $record[this.foreignPivotKey] = this.$parent[this.$parentKey];

        if ($timed) {
            $record = this.addTimestampsToAttachment($record);
        }
        return $record;
    }

    addTimestampsToAttachment($record, $exists = false) {
        let $fresh = this.$parent.freshTimestamp();

        if (this.$using) {
            $pivotModel = new this.$using;

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
            empty(this.pivotWheres) &&
            empty(this.pivotWhereIns) &&
            empty(this.pivotWhereNulls)) {
            $results = this.detachUsingCustomClass($ids);
        } else {
            $query = this.newPivotQuery();

            if (!is_null($ids)) {
                $ids = this.parseIds($ids);

                if (empty($ids)) {
                    return 0;
                }

                $query.whereIn(this.getQualifiedRelatedPivotKeyName(), (array) $ids);
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

        foreach(this.parseIds($ids) as $id) {
            $results += this.newPivot([
                this.foreignPivotKey => this.$parent. { this.$parentKey },
                this.$relatedPivotKey => $id,
            ], true).delete();
        }

        return $results;
    }

    getCurrentlyAttachedPivots() {
        return this.newPivotQuery().get().map(function($record) {
            $class = this.$using ? : Pivot::class;

            $pivot = $class::fromRawAttributes(this.$parent, (array) $record, this.getTable(), true);

            return $pivot.setPivotKeys(this.foreignPivotKey, this.$relatedPivotKey);
        });
    }

    newPivot($attributes = [], $exists = false) {
        $pivot = this.related.newPivot(
            this.$parent, $attributes, this.table, $exists, this.$using
        );

        return $pivot.setPivotKeys(this.foreignPivotKey, this.$relatedPivotKey);
    }

    newExistingPivot($attributes = []) {
        return this.newPivot($attributes, true);
    }

    newPivotStatement() {
        return this.query.getQuery().newQuery().from(this.table);
    }

    newPivotStatementForId($id) {
        return this.newPivotQuery().whereIn(this.$relatedPivotKey, this.parseIds($id));
    }

    newPivotQuery() {
        $query = this.newPivotStatement();

        foreach(this.pivotWheres as $arguments) {
            $query.where(...$arguments);
        }

        foreach(this.pivotWhereIns as $arguments) {
            $query.whereIn(...$arguments);
        }

        foreach(this.pivotWhereNulls as $arguments) {
            $query.whereNull(...$arguments);
        }

        return $query.where(this.getQualifiedForeignPivotKeyName(), this.$parent. { this.$parentKey });
    }

    withPivot($columns) {
        this.$pivotColumns = this.$pivotColumns.concat(
            this.$pivotColumns, Array.isArray($columns) ? $columns : arguments
        );

        return this;
    }

    parseIds($value) {
        if ($value instanceof Model) {
            return [$value. { this.relatedKey }];
        }

        if ($value instanceof Collection) {
            return $value.pluck(this.relatedKey).all();
        }

        if ($value instanceof BaseCollection) {
            return $value.toArray();
        }

        return $value;
    }

    parseId($value) {
        return $value instanceof Model ? $value. { this.relatedKey } : $value;
    }

    castKeys($keys) {
        return $keys.map(function($v) {
            return this.castKey($v);
        });
    }

    castKey($key) {
        return this.getTypeSwapValue(
            this.related.getKeyType(),
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
                return (int) $value;
            case 'real':
            case 'float':
            case 'double':
                return (float) $value;
            case 'string':
                return (string) $value;
            default:
                return $value;
        }
    }
}
module.exports = InteractsWithPivotTable