const Command = require('@ostro/console/command')
class DatabaseQuery extends Command {

    constructor(resolver) {
        super()
        this.$resolver = resolver
    }

    get $signature() {
        return 'db:query';
    }

    get $arguments() {
        return [
            this.createArgument('<query>', 'database query string').required()
        ]
    }

    get $description() {
        return 'database query'
    };

    handle() {
        return this.$resolver.query(this.input.argument('query')).then(res => {
            console.log(res)
        })

    }

}

module.exports = DatabaseQuery