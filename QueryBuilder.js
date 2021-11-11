const { Macroable } = require('@ostro/support/macro')
const Query = require('./query/builder')
class QueryBuilder extends Macroable.implement(Query) {
    constructor(__query) {
        super()
        this.$query = __query
    }

}
module.exports = QueryBuilder