/**
 * Class Processor.
 */
class Processor {

    /**
     * Process an "select" result.
     *
     * @param query - Query builder instance.
     * @param results - Raw query results.
     * @returns Processed query results.
     */
    public processSelect(query: any, results: any): any {
        return results;
    }

    /**
     * Process an "insert get ID" statement.
     *
     * @param query - Query builder instance.
     * @param sql - SQL query string.
     * @param values - Insert values dictionary.
     * @param sequence - Sequence column name.
     * @returns Inserted identifier.
     */
    public processInsertGetId(query: any, sql: any, values: Record<string, any>, sequence: any = null): any {
        return sequence;
    }

    /**
     * Process the results of a tables query.
     *
     * @param results - Raw table list.
     * @returns Processed table list.
     */
    public processTables(results: any): any {
        return results;
    }

    /**
     * Process the results of a views query.
     *
     * @param results - Raw view list.
     * @returns Processed view list.
     */
    public processViews(results: any): any {
        return results;
    }

    /**
     * Process the results of a types query.
     *
     * @param results - Raw type list.
     * @returns Processed type list.
     */
    public processTypes(results: any): any {
        return results;
    }

    /**
     * Process the results of a columns query.
     *
     * @param results - Raw column listing.
     * @returns Processed column listing.
     */
    public processColumns(results: any): any {
        return results;
    }

    /**
     * Process the results of an indexes query.
     *
     * @param results - Raw index listing.
     * @returns Processed index listing.
     */
    public processIndexes(results: any): any {
        return results;
    }

    /**
     * Process the results of a foreign keys query.
     *
     * @param results - Raw foreign keys.
     * @returns Processed foreign keys.
     */
    public processForeignKeys(results: any): any {
        return results;
    }

    /**
     * Process the results of a column listing query.
     *
     * @param results - Raw column listing.
     * @returns Processed column listing.
     */
    public processColumnListing(results: any): any {
        return results;
    }

}

export default Processor;