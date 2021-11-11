class RelationNotFoundException {
    constructor(message) {
        this.name = this.constructor.name;
        this.code = 'ERR_INVALID_ARG_VALUE';
        this.message = message || 'Invalid Argument';
        this.statusCode = 500
        Error.captureStackTrace(this, this.constructor);
    }


    static make($model, $relation) {
        let $class = get_class_name($model);

        let $instance = new this(`Call to undefined relationship [${$relation}] on model [${$class}].`);

        $instance.$model = $class;
        $instance.$relation = $relation;

        return $instance;
    }
}

module.exports = RelationNotFoundException