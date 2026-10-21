import DateTime from '@ostro/support/dateTime';
import { is_null } from '@ostro/support/function';

/**
 * Class HasTimestamps.
 */
class HasTimestamps {
    [key: string]: any;
    $timestamps = true;

    /**
     * touch method.
     * @returns {any}
     */
    public touch() {
        if (!this.usesTimestamps()) {
            return false;
        }

        this.updateTimestamps();

        return this.save();
    }

    /**
     * updateTimestamps method.
     * @returns {any}
     */
    public updateTimestamps() {
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

    /**
     * setCreatedAt method.
     * @param {*} $value
     * @returns {any}
     */
    public setCreatedAt($value: any) {
        this.setAttribute(this.getCreatedAtColumn(), $value)
        return this;
    }

    /**
     * setUpdatedAt method.
     * @param {*} $value
     * @returns {any}
     */
    public setUpdatedAt($value: any) {
        this.setAttribute(this.getUpdatedAtColumn(), $value)
        return this;
    }

    /**
     * freshTimestamp method.
     * @returns {any}
     */
    public freshTimestamp() {
        return DateTime.now();
    }

    /**
     * freshTimestampString method.
     * @returns {any}
     */
    public freshTimestampString() {
        return this.fromDateTime(this.freshTimestamp());
    }

    /**
     * fromDateTime method.
     * @param {*} time
     * @returns {any}
     */
    public fromDateTime(time: any) {
        return time.format(this.$dateFormat);
    }

    /**
     * usesTimestamps method.
     * @returns {any}
     */
    public usesTimestamps() {
        return this.$timestamps;
    }

    /**
     * getCreatedAtColumn method.
     * @returns {any}
     */
    public getCreatedAtColumn() {
        return this.CREATED_AT;
    }

    /**
     * getUpdatedAtColumn method.
     * @returns {any}
     */
    public getUpdatedAtColumn() {
        return this.UPDATED_AT;
    }

    /**
     * getQualifiedCreatedAtColumn method.
     * @returns {any}
     */
    public getQualifiedCreatedAtColumn() {
        return this.qualifyColumn(this.getCreatedAtColumn());
    }

    /**
     * getQualifiedUpdatedAtColumn method.
     * @returns {any}
     */
    public getQualifiedUpdatedAtColumn() {
        return this.qualifyColumn(this.getUpdatedAtColumn());
    }

    /**
     * isIgnoringTouch method.
     * @returns {any}
     */
    public isIgnoringTouch() {
        return false;
    }
}

export default HasTimestamps;
