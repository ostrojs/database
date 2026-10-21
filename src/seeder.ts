import InvalidArgumentException from '@ostro/support/exceptions/invalidArgumentException';
import { get_class_name } from '@ostro/support/function';

/**
 * Class Seeder.
 */
class Seeder {

    public $command: any = null;
    public $resolver: any;
    public $app: any = null;
    public declare run?: any;

    /**
     * Create a new instance.
     * @param {*} $resolver
     */
    constructor($resolver: any) {
        this.$resolver = $resolver
    }

    /**
     * call method.
     * @async
     * @param {*} $classes
     * @param {*} $silent
     * @param {*} $parameters
     * @returns {any}
     */
    public async call($classes: any, $silent: boolean = false, $parameters: any[] = []) {
        $classes = Array.isArray($classes) ? $classes : [$classes];

        for (let $class of $classes) {
            let $seeder = this.resolve($class);

            let $name = get_class_name($seeder);
            if ($silent === false && this.$command) {
                this.$command.getOutput().writeln(`<comment>Seeding:</comment> ${$name}`);
            }

            let $startTime = Date.now();
            await $seeder.__invoke($parameters);

            let $runTime = Number(((Date.now() - $startTime) * 1000).toFixed(2));

            if ($silent === false && this.$command) {
                this.$command.getOutput().writeln(`<info>Seeded:</info>  ${$name} (${$runTime}ms)`);
            }
        }

        return this;
    }

    /**
     * callWith method.
     * @param {*} $class
     * @param {*} $parameters
     * @returns {any}
     */
    public callWith($class: any, $parameters: any[] = []) {
        return this.call($class, false, $parameters);
    }

    /**
     * callSilent method.
     * @param {*} $class
     * @param {*} $parameters
     * @returns {any}
     */
    public callSilent($class: any, $parameters: any[] = []) {
        return this.call($class, true, $parameters);
    }

    /**
     * resolve method.
     * @param {*} $class
     * @returns {any}
     */
    public resolve($class: any) {

        let $instance
        if (this.$app) {
            $instance = this.$app.make($class);

            $instance.setContainer(this.$app);
        } else {
            $instance = new $class;
        }

        if (this.$command) {
            $instance.setCommand(this.$command);
        }

        return $instance;
    }

    /**
     * setContainer method.
     * @param {*} app
     * @returns {any}
     */
    public setContainer(app: any) {
        this.$app = app;

        return this;
    }

    /**
     * setCommand method.
     * @param {*} $command
     * @returns {any}
     */
    public setCommand($command: any) {
        this.$command = $command;

        return this;
    }

    /**
     * __invoke method.
     * @param {*} $parameters
     * @returns {any}
     */
    public __invoke($parameters: any[] = []) {
        if (!this['run']) {
            throw new InvalidArgumentException('Method [run] missing from ' + get_class_name(this));
        }

        return this.$app ?
            this.$app.call([this, 'run'], $parameters) :
            this.run(...$parameters);
    }
}

export default Seeder;