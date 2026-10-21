import DetectsLostConnections from '../detectsLostConnections';

/**
 * Class Connector.
 */
class Connector extends DetectsLostConnections {

    public $options: Record<string, any> = {};

    /**
     * Create a new connection instance.
     *
     * @param dsn - DSN string.
     * @param configOrUser - Configuration object or username.
     * @param optionsOrPass - Options object or password.
     * @param options - Connection options.
     * @returns Connection instance.
     */
    public createConnection(dsn: any, configOrUser: any, optionsOrPass?: any, options: Record<string, any> = {}): any {
        if (arguments.length === 4) {
            return new (global as any).PDO(dsn, configOrUser, optionsOrPass, options);
        }
        const config = configOrUser || {};
        const username = config['username'] || null;
        const password = config['password'] || null;

        try {
            return this.createConnection(
                dsn, username, password, optionsOrPass || {}
            );
        } catch (e) {
            return this.tryAgainIfCausedByLostConnection(
                e, dsn, username, password, optionsOrPass || {}
            );
        }
    }

    /**
     * Handle a connection lost exception by retrying.
     *
     * @param e - Error thrown.
     * @param dsn - DSN string.
     * @param username - Username string.
     * @param password - Password string.
     * @param options - Options dictionary.
     * @returns Connection instance.
     */
    public tryAgainIfCausedByLostConnection(e: any, dsn: any, username: any, password: string, options: Record<string, any>): any {
        if (this.causedByLostConnection(e)) {
            return this.createConnection(dsn, username, password, options);
        }

        throw e;
    }

    /**
     * Get the default PDO connection options.
     *
     * @returns Default options dictionary.
     */
    public getDefaultOptions(): Record<string, any> {
        return this.$options;
    }

    /**
     * Set the default PDO connection options.
     *
     * @param options - Options dictionary.
     */
    public setDefaultOptions(options: Record<string, any>): void {
        this.$options = options;
    }
}

/* c8 ignore next */
export default Connector;