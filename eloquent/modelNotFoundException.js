const { get_class_name } = require("@ostro/support/function");
const ModelNotFoundExceptionContracts = require("@ostro/contracts/database/eloquent/modelNotFoundException");

class ModelNotFoundException extends ModelNotFoundExceptionContracts {
    $model;

    $ids;

    constructor() {
        super();
        this.name = this.constructor.name;
        this.code = 'ERR_INVALID_ARG_VALUE';
        this.statusCode = 500

    }


    setModel($model, $ids = []) {
        this.$model = $model;
        this.$ids = $ids;

        this.message = `No query results for model [${get_class_name($model)}]`;

        if (count(this.$ids) > 0) {
            this.message += ' ' + this.$ids.join(', ');
        } else {
            this.message += '.';
        }

        return this;
    }

    getModel() {
        return this.$model;
    }

    getIds() {
        return this.$ids;
    }
}

module.exports = ModelNotFoundException
