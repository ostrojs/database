const InvalidArgumentException = require('@ostro/support/exceptions/invalidArgumentException')
const kCommand = Symbol('command')
class Seeder {

    get $command() {
        return this[kCommand] = this[kCommand] || null
    };

    set $command(value) {
        return this[kCommand] = value
    };

    constructor($resolver) {
        this.$resolver = $resolver
    }

    async call($classes, $silent = false, $parameters = []) {
        $classes = Array.isArray($classes) ? $classes : [$classes];

        for (let $class of $classes) {
            let $seeder = this.resolve($class);

            let $name = get_class_name($seeder);
            if ($silent === false && this.$command) {
                this.$command.getOutput().writeln(`<comment>Seeding:</comment> ${$name}`);
            }

            let $startTime = Date.now();
            await $seeder.__invoke($parameters);

            let $runTime = Number((Date.now() - $startTime) * 1000, 2);

            if ($silent === false && this.$command) {
                this.$command.getOutput().writeln(`<info>Seeded:</info>  ${$name} (${$runTime}ms)`);
            }
        }

        return this;
    }

    callWith($class, $parameters = []) {
        return this.call($class, false, $parameters);
    }

    callSilent($class, $parameters = []) {
        return this.call($class, true, $parameters);
    }

    resolve($class) {

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

    setContainer(app) {
        this.$app = app;

        return this;
    }

    setCommand($command) {
        this.$command = $command;

        return this;
    }

    __invoke($parameters = []) {
        if (!this['run']) {
            throw new InvalidArgumentException('Method [run] missing from ' + get_class_name(this));
        }

        return this.$app ?
            this.$app.call([this, 'run'], $parameters) :
            this.run(...$parameters);
    }
}

module.exports = Seeder