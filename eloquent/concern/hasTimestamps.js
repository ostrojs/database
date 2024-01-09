const DateTime = require('@ostro/support/dateTime')

class HasTimestamps {

    $timestamps = true;

    touch() {
        if (!this.usesTimestamps()) {
            return false;
        }

        this.updateTimestamps();

        return this.save();
    }

    updateTimestamps() {
        let $time = this.freshTimestampString();

        let $updatedAtColumn = this.getUpdatedAtColumn();

        if (!is_null($updatedAtColumn) && !this.isDirty($updatedAtColumn)) {
            this.setUpdatedAt($time);
        }

        let $createdAtColumn = this.getCreatedAtColumn();

        if (!this.$exists && !is_null($createdAtColumn) && !this.isDirty($createdAtColumn)) {
            this.setCreatedAt($time);
        }
    }

    setCreatedAt($value) {
        this.setAttribute(this.getCreatedAtColumn(), $value)
        return this;
    }

    setUpdatedAt($value) {
        this.setAttribute(this.getUpdatedAtColumn(), $value)
        return this;
    }

    freshTimestamp() {
        return DateTime.now();
    }

    freshTimestampString() {
        return this.fromDateTime(this.freshTimestamp());
    }

    fromDateTime(time) {
        return time.format(this.$dateFormat);
    }

    usesTimestamps() {
        return this.$timestamps;
    }

    getCreatedAtColumn() {
        return this.CREATED_AT;
    }

    getUpdatedAtColumn() {
        return this.UPDATED_AT;
    }

    getQualifiedCreatedAtColumn() {
        return this.qualifyColumn(this.getCreatedAtColumn());
    }

    getQualifiedUpdatedAtColumn() {
        return this.qualifyColumn(this.getUpdatedAtColumn());
    }
}

module.exports = HasTimestamps
