const BaseCollection = require('@ostro/support/collection')
const CollectionInterface = require('@ostro/contracts/collection/collect')
const ModelInterface = require('@ostro/contracts/database/eloquent/model')

class Collection extends BaseCollection {

    toArray() {
        return this.map($value => {
            return $value instanceof ModelInterface ? $value.toJson() : $value
        }).all()
    }
    serialize(){
        return this.toArray()

    }

}

module.exports = Collection