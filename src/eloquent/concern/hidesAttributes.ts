import { empty, is_array, value } from '@ostro/support/function';
import { difference, union } from 'lodash';
/**
 * Class HidesAttributes.
 */
class HidesAttributes {

    $hidden = [];

    $visible = [];

    /**
     * getHidden method.
     * @returns {any}
     */
    public getHidden() {
        return this.$hidden;
    }

    /**
     * setHidden method.
     * @param {*} $hidden
     * @returns {any}
     */
    public setHidden($hidden: any) {
        this.$hidden = $hidden;

        return this;
    }

    /**
     * getVisible method.
     * @returns {any}
     */
    public getVisible() {
        return this.$visible;
    }

    /**
     * setVisible method.
     * @param {*} $visible
     * @returns {any}
     */
    public setVisible($visible: any) {
        this.$visible = $visible;
        return this;
    }

    /**
     * makeVisible method.
     * @param {*} $attributes
     * @returns {any}
     */
    public makeVisible($attributes: Record<string, any>) {
        $attributes = Array.isArray($attributes) ? $attributes : Array.from(arguments);

        this.$hidden = difference(this.$hidden, $attributes);

        if (!empty(this.$visible)) {
            this.$visible = union(this.$visible, $attributes);
        }

        return this;
    }

    /**
     * makeVisibleIf method.
     * @param {*} $condition
     * @param {*} $attributes
     * @returns {any}
     */
    public makeVisibleIf($condition: any, $attributes: Record<string, any>) {
        return value($condition, this) ? this.makeVisible($attributes) : this;
    }

    /**
     * makeHidden method.
     * @param {*} $attributes
     * @returns {any}
     */
    public makeHidden($attributes: Record<string, any>) {
        $attributes = Array.isArray($attributes) ? $attributes : Array.from(arguments);
        this.$hidden = union(this.$hidden, $attributes);

        return this;
    }

    /**
     * makeHiddenIf method.
     * @param {*} $condition
     * @param {*} $attributes
     * @returns {any}
     */
    public makeHiddenIf($condition: any, $attributes: Record<string, any>) {
        return value($condition, this) ? this.makeHidden($attributes) : this;
    }
}

export default HidesAttributes;