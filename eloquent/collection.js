const BaseCollection = require('@ostro/support/collection')
const CollectionInterface = require('@ostro/contracts/collection/collect')
const ModelInterface = require('@ostro/contracts/database/eloquent/model')

class Collection extends BaseCollection {

    toArray() {
        return this.map($value => {
            return $value instanceof ModelInterface ? $value.toJson() : $value
        }).all()
    }
    serialize() {
        let $value = this.all();
        if(Array.isArray($value)){
            return this.toArray()

        }else{
            return this.toJSON()
        }

    }
    toJSON() {
        let $value = this.all();
        if(Array.isArray($value)){
            throw Error(`Use toArray insted of toJson / toJSON  method.`)
        }
        return $value instanceof ModelInterface ? $value.toJson() : $value
    }
    toJson(){
        return this.toJSON()
    }

}

module.exports = Collection