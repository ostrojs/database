import { is_object } from '@ostro/support/function';
/**
 * Class InteractsWithDictionary.
 */
class InteractsWithDictionary {

    /**
     * getDictionaryKey method.
     * @param {*} $attribute
     * @returns {any}
     */
    public getDictionaryKey($attribute: string) {
        if ($attribute != null && is_object($attribute)) {
            if (typeof $attribute.toString === 'function' && $attribute.toString !== Object.prototype.toString) {
                return $attribute.toString();
            }
            throw new Error('Model attribute value is an object but does not have a __toString method.');
        }

        return $attribute;
    }
}

export default InteractsWithDictionary;