import { is_null } from '@ostro/support/function';
import Connection from './connection';
import SchemaGrammar from '../schema/grammars/postgresGrammar';
import QueryGrammar from '../query/grammars/postgresGrammar';
import QueryProcessor from '../query/processors/mysqlProcessor';
import SchemaBuilder from '../schema/postgresBuilder';

/**
 * Class PostgresConnection.
 */
class PostgresConnection extends Connection {
    /**
     * getDefaultSchemaGrammar method.
     * @returns {any}
     */
    public getDefaultSchemaGrammar() {
        const $grammar = new SchemaGrammar
        $grammar.setConnection(this);

        return this.withTablePrefix($grammar)
    }

    /**
     * getDefaultQueryGrammar method.
     * @returns {any}
     */
    public getDefaultQueryGrammar() {
        const $grammar = new QueryGrammar()
        $grammar.setConnection(this);

        return this.withTablePrefix($grammar);
    }

    /**
     * getSchemaBuilder method.
     * @returns {any}
     */
    public getSchemaBuilder() {
        if (is_null(this.$schemaGrammar)) {
            this.useDefaultSchemaGrammar();
        }

        return new SchemaBuilder(this);
    }

    /**
     * getDefaultPostProcessor method.
     * @returns {any}
     */
    public getDefaultPostProcessor() {
        return new QueryProcessor;
    }

    /**
     * __call method.
     * @param {*} target
     * @param {*} method
     * @param {*} parameters
     * @returns {any}
     */
    public __call(target: Record<string, any>, method: string, parameters: any[]) {
        return target.$connection[method](...parameters)
    }

}

export default PostgresConnection;
