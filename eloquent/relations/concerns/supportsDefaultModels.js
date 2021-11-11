const kWithDefault = Symbol('withDefault')
class SupportsDefaultModels {

    $withDefault = null;

    withDefault($callback = true) {
        this.$withDefault = $callback;

        return this;
    }

    getDefaultFor($parent) {
        if (!this.$withDefault) {
            return;
        }

        let $instance = this.newRelatedInstanceFor($parent);

        if (is_callable(this.$withDefault)) {
            return this.$withDefault.call($instance, $parent) || $instance;
        }

        if (Array.isArray(this.$withDefault)) {
            $instance.forceFill(this.$withDefault);
        }

        return $instance;
    }
}

module.exports = SupportsDefaultModels