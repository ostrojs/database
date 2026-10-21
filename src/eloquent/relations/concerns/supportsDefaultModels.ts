import { is_callable } from '@ostro/support/function';
const kWithDefault = Symbol('withDefault')
/**
 * Class SupportsDefaultModels.
 */
class SupportsDefaultModels {
    [key: string]: any;
    $withDefault = null;

    /**
     * withDefault method.
     * @param {*} $callback
     * @returns {any}
     */
    public withDefault($callback: boolean = true) {
        this.$withDefault = $callback;

        return this;
    }

    /**
     * getDefaultFor method.
     * @param {*} $parent
     * @returns {any}
     */
    public getDefaultFor($parent: any) {
        if (!this.$withDefault) {
            return;
        }

        let $instance = this.newRelatedInstanceFor($parent);

        if (is_callable(this.$withDefault)) {
            return this.$withDefault.call($instance, $parent) || $instance;
        }

        if (typeof this.$withDefault === 'object' && this.$withDefault !== null) {
            $instance.forceFill(this.$withDefault);
        }

        return $instance;
    }
}

export default SupportsDefaultModels;