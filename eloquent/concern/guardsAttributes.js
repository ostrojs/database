const { get_class_name } = require('@ostro/support/function')
class GuardsAttributes {
    $fillable = [];

    $guarded = ['*'];

    static $unguarded = false;

    static $guardableColumns = [];
    getFillable() {
        return this.$fillable;
    }

    fillableData($values) {
        const datas = [];
        if (!Array.isArray($values)) {
            $values = [$values]
        }
        for (let obj of $values) {
            const keys = Object.keys(obj);
            const fillableData = {};
            for (let key of keys) {
                if (this.isFillable(key)) {
                    fillableData[key] = obj[key];
                }
            }
            datas.push(fillableData)
        }
        return datas;
    }

    fillable($fillable) {
        this.$fillable = $fillable;

        return this;
    }

    mergeFillable($fillable) {
        this.$fillable = this.$fillable.concat($fillable);

        return this;
    }

    getGuarded() {
        return this.$guarded === false ? [] :
            this.$guarded;
    }

    guard($guarded) {
        this.$guarded = $guarded;

        return this;
    }

    mergeGuarded($guarded) {
        this.$guarded = this.$guarded.concat($guarded);

        return this;
    }

    unguard($state = true) {
        this.constructor.$unguarded = $state;
    }

    reguard() {
        this.constructor.$unguarded = false;
    }

    isUnguarded() {
        return this.constructor.$unguarded;
    }

    unguarded($callback) {
        if (this.constructor.$unguarded) {
            return $callback();
        }

        this.unguard();

        try {
            return $callback();
        } finally {
            this.reguard();
        }
    }

    isFillable($key) {
        if (this.constructor.$unguarded) {
            return true;
        }

        if (this.getFillable().indexOf($key) > -1) {
            return true;
        }

        if (this.isGuarded($key)) {
            return false;
        }

        return empty(this.getFillable()) &&
            $key.includes('.') &&
            !String.startsWith($key, '_');
    }

    isGuarded($key) {
        if (empty(this.getGuarded())) {
            return false;
        }
        const reg = new RegExp('/^' + $key.escape() + '$/', 'i')

        return this.getGuarded().toString() == ['*'].toString() ||
            !empty(this.getGuarded().filter(item => reg.test(item)))
    }

    async isGuardableColumn($key) {
        if (!isset(this.constructor.$guardableColumns[this.name])) {
            this.constructor.$guardableColumns[get_class_name(this)] = await this.getConnection()
                .getColumnListing(this.getTable());
        }

        return this.constructor.$guardableColumns[get_class_name(this)].indexOf($key) > -1;
    }

    totallyGuarded() {
        return count(this.getFillable()) === 0 && this.getGuarded() == ['*'];
    }

    fillableFromArray($attributes) {
        if (count(this.getFillable()) > 0 && !this.constructor.$unguarded) {
            return this.getFillable().intersection(Object.keys($attributes));
        }

        return Object.keys($attributes);
    }
}
module.exports = GuardsAttributes
