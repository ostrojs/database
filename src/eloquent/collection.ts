import BaseCollection from '@ostro/support/collection';
import ModelInterface from '@ostro/contracts/database/eloquent/model';
/**
 * Class Collection.
 */
class Collection extends BaseCollection {

    /**
     * toArray method.
     * @returns {any}
     */
    public toArray() {
        return this.map($value => {
            return $value instanceof ModelInterface ? ($value as any).toJson() : $value
        }).all()
    }
    /**
     * serialize method.
     * @returns {any}
     */
    public serialize() {
        let $value = this.all();
        if (Array.isArray($value)) {
            return this.toArray()

        } else {
            return this.toJSON()
        }

    }
    /**
     * toJSON method.
     * @returns {any}
     */
    public toJSON() {
        let $value = this.all();
        if (Array.isArray($value)) {
            for (let i in $value) {
                if ($value[i] instanceof ModelInterface) {
                    $value[i] = ($value[i] as any).toJson()
                }
            }
        }
        return ($value as any) instanceof ModelInterface ? ($value as any).toJson() : $value
    }

    /**
     * toJson method.
     * @returns {any}
     */
    public toJson() {
        return this.toJSON()
    }

}

export default Collection;
