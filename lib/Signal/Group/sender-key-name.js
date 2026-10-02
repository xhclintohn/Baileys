function isNull(str) {
    return str === null || str === '';
}
export class SenderKeyName {
    constructor(groupId, sender) {
        this.groupId = groupId;
        this.sender = sender;
    }
    getId() {
        return `${this.groupId}:${this.getSender().id}:${this.getSender().deviceId}`;
    }
    getGroupId() {
        return this.groupId;
    }
    getSender() {
        return this.sender;
    }
    toString() {
        return this.getId();
    }
    equals(other) {
        if (other === null)
            return false;
        return this.groupId === other.groupId && this.sender.toString() === other.sender.toString();
    }
    hashCode() {
        return ((this.groupId?.length || 0) * 31) ^ (this.sender?.id?.length || 0);
    }
}
