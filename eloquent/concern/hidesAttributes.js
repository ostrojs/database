class HidesAttributes {

    $hidden = [];

    $visible = [];

    getHidden() {
        return this.$hidden;
    }

    setHidden($hidden) {
        this.$hidden = $hidden;

        return this;
    }

    getVisible() {
        return this.$visible;
    }

    setVisible($visible) {
        this.$visible = $visible;
        return this;
    }

    makeVisible($attributes) {
        $attributes = Array.isArray($attributes) ? $attributes : arguments();

        this.$hidden = this.$hidden.intersection(Object.keys($attributes));

        if (!empty(this.$visible)) {
            this.$visible = this.$visible.intersection(Object.keys($attributes));
        }

        return this;
    }

    makeVisibleIf($condition, $attributes) {
        return value($condition, this) ? this.makeVisible($attributes) : this;
    }

    makeHidden($attributes) {
        this.$hidden = this.$hidden.concat(
            Array.isArray($attributes) ? $attributes : arguments()
        );

        return this;
    }

    makeHiddenIf($condition, $attributes) {
        return value($condition, this) ? this.makeHidden($attributes) : this;
    }
}

module.exports = HidesAttributes