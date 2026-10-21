import { empty } from '@ostro/support/function';
import Builder from './builder';

/**
 * Class PgSqlSchema.
 */
/* c8 ignore next */
class PgSqlSchema extends Builder {
    /**
     * Get all of the table names for the database.
     *
     * @returns Query promise resolving to table names.
     */
    public getAllTables(): any {
        return this.$connection.table('pg_tables')
            .where('schemaname', this.$connection.getConfig('schema', 'public'))
            .pluck('tablename');
    }

    /**
     * Drop all tables from the database.
     *
     * @returns Promise resolving when all tables are dropped.
     */
    public async dropAllTables(): Promise<void> {
        const tables: string[] = await this.getAllTables();
        await this.dropIfExists(tables);
    }

    /**
     * Compile the SQL statement to get all user-defined types.
     *
     * @returns Raw query expression.
     */
    public compileGetTypes(): any {
        return this.raw(`
                    SELECT
                        t.typname AS name,
                        n.nspname AS schema,
                        t.typtype AS type,
                        t.typcategory AS category,
                        (
                            (t.typinput = 'array_in'::regproc AND t.typoutput = 'array_out'::regproc)
                            OR t.typtype = 'm'
                        ) AS implicit
                    FROM
                        pg_type t
                    JOIN
                        pg_namespace n ON n.oid = t.typnamespace
                    LEFT JOIN
                        pg_class c ON c.oid = t.typrelid
                    LEFT JOIN
                        pg_type el ON el.oid = t.typelem
                    LEFT JOIN
                        pg_class ce ON ce.oid = el.typrelid
                    WHERE
                        (
                            (t.typrelid = 0 AND (ce.relkind = 'c' OR ce.relkind IS NULL))
                            OR c.relkind = 'c'
                        )
                        AND NOT EXISTS (
                            SELECT 1
                            FROM pg_depend d
                            WHERE d.objid IN (t.oid, t.typelem)
                            AND d.deptype = 'e'
                        )
                        AND n.nspname NOT IN ('pg_catalog', 'information_schema')`
        );
    }

    /**
     * Drop table if exists with CASCADE option.
     *
     * @param tableNames - Array of table names.
     * @returns Result of raw drop statement.
     */
    public async dropIfExists(tableNames: any): Promise<any> {
        return this.raw('drop table if exists ' + tableNames.join(',') + ' cascade');
    }

    /**
     * Drop all user-defined types from the database.
     *
     * @returns Promise resolving when types are dropped.
     */
    public async dropAllTypes(): Promise<void> {
        const types: any = await this.compileGetTypes();
        const $types: string[] = [];
        const $domains: string[] = [];
        const $schemas: string[] = [this.$connection.getConfig('schema', 'public')];
        for (const $type of types.rows) {
            if (!$type['implicit'] && $schemas.includes($type['schema'])) {
                if ($type['type'] === 'domain') {
                    $domains.push($type['name']);
                } else {
                    $types.push($type['name']);
                }
            }
        }
        if (!empty($types)) {
            await this.raw(`drop type ${$types.join(',')} cascade`);
        }

        if (!empty($domains)) {
            await this.raw(`drop domain ${$types.join(',')} cascade`);
        }
    }
}

/* c8 ignore next */
export default PgSqlSchema;
