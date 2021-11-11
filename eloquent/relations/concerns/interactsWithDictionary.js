class InteractsWithDictionary {

    getDictionaryKey($attribute) {
        if ($attribute != null && is_object($attribute)) {
            return $attribute.toString();
            throw new Error('Model attribute value is an object but does not have a __toString method.');
        }

        return $attribute;
    }
}

module.exports = InteractsWithDictionary