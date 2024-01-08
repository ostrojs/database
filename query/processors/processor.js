class Processor {

    processSelect($query, $results) {
        return $results;
    }

    processInsertGetId($query, $sql, $values, $sequence = null) {
        return $sequence
    }

    processTables($results) {
        return $results;
    }

    processViews($results) {
        return $results;
    }

    processTypes($results) {
        return $results;
    }

    processColumns($results) {
        return $results;
    }

    processIndexes($results) {
        return $results;
    }

    processForeignKeys($results) {
        return $results;
    }

    processColumnListing($results) {
        return $results;
    }

}

module.exports = Processor;