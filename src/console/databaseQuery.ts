import Command from '@ostro/console/command';
/**
 * Class DatabaseQuery.
 */
class DatabaseQuery extends Command {
    [key: string]: any;

    /**
     * Create a new instance.
     * @param {*} resolver
     */
    constructor(resolver: any) {
        super()
        this.$resolver = resolver;
    }

    public get $signature(): string {
        return 'db:query';
    }

    public get $arguments(): any[] {
        return [
        this.createArgument('<query>', 'database query string').required()
    ];
    }

    public get $description(): string {
        return 'database query';
    }

    /**
     * handle method.
     * @returns {any}
     */
    public handle() {
        return this.$resolver.connection().raw(this.input.argument('query')).then(res => {
            console.log(res)
        })

    }

}

export default DatabaseQuery;