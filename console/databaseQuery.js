const Command = require('@ostro/console/command')
class DatabaseQuery extends Command {

    constructor(resolver) {
        super()
        this.$resolver = resolver;
    }

    $signature = 'db:query';

    $arguments = [
        this.createArgument('<query>', 'database query string').required()
    ];

    $description = 'database query';

    handle() {
        return this.$resolver.query(this.input.argument('query')).then(res => {
            console.log(res)
        })

    }

}

module.exports = DatabaseQuery