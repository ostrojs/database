class GuardsAttributes {
    $fillable = [];

    get $guarded() {
        return ['*']
    }

    static $unguarded = false;

    static $guardableColumns = [];

    getFillable() {
        return this.$fillable;
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

        return this.getGuarded() == ['*'] ||
            !empty(preg_grep('/^'.preg_quote($key) + '$/i', this.getGuarded())) ||
            !this.isGuardableColumn($key);
    }

    isGuardableColumn($key) {
        if (!isset(this.constructor.$guardableColumns[this.name])) {
            this.constructor.$guardableColumns[get_class(this)] = this.getConnection()
                .getSchemaBuilder()
                .getColumnListing(this.getTable());
        }

        return this.constructor.$guardableColumns[get_class(this)].indexOf($key) > -1;
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