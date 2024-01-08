
const DetectsLostConnections = require('@ostro/database/detectsLostConnections')
class Connector extends DetectsLostConnections {

    $options = {};

    createConnection($dsn, $config, $options) {
        const $username = $config['username'] || null;
        const $password = $config['password'] || null;

        try {
            return this.createConnection(
                $dsn, $username, $password, $options
            );
        } catch ($e) {
            return this.tryAgainIfCausedByLostConnection(
                $e, $dsn, $username, $password, $options
            );
        }
    }

    createConnection($dsn, $username, $password, $options) {
        return new PDO($dsn, $username, $password, $options);
    }

    tryAgainIfCausedByLostConnection($e, $dsn, $username, $password, $options) {
        if (this.causedByLostConnection($e)) {
            return this.createConnection($dsn, $username, $password, $options);
        }

        throw $e;
    }

    getDefaultOptions() {
        return this.$options;
    }

    setDefaultOptions($options) {
        this.$options = $options;
    }
}
module.exports = Connector