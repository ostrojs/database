const Builder = require('./builder')
class PgSqlSchema extends Builder {
    getAllTables() {
        return this.$connection.table('pg_tables')
            .where('schemaname', this.$connection.getConfig('schema', 'public'))
            .pluck('tablename');
    }
    async dropAllTables() {
        const tables = await this.getAllTables()
        await this.dropIfExists(tables);
        // await this.dropAllTypes();
    }
    compileGetTypes() {
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
        )
    }

    async dropIfExists(tableNames) {
        return this.raw('drop table if exists ' + tableNames.join(',') + ' cascade')
    }

    async dropAllTypes() {
        const types = await this.compileGetTypes();
        const $types = [];
        const $domains = [];
        const $schemas = [];
        for (let $type of types.rows) {
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

module.exports = PgSqlSchema
