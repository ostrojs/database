class HasGlobalScopes {

    addGlobalScope($scope, $implementation = null) {
        if (is_string($scope) && !is_null($implementation)) {
            return this.constructor.$globalScopes[this.constructor.class][$scope] = $implementation;
        } else if (typeof $scope == 'function') {
            return this.constructor.$globalScopes[this.constructor.class][spl_object_hash($scope)] = $scope;
        } else if ($scope instanceof Scope) {
            return this.constructor.$globalScopes[this.constructor.class][get_class($scope)] = $scope;
        }

        throw new InvalidArgumentException('Global scope must be an instance of Closure or Scope.');
    }

    hasGlobalScope($scope) {
        return !is_null(this.constructor.getGlobalScope($scope));
    }

    getGlobalScope($scope) {
        if (is_string($scope)) {
            return Arr.get(this.constructor.$globalScopes, this.constructor.class +
                '.' + $scope);
        }

        return Arr.get(
            this.constructor.$globalScopes, this.constructor.class +
            '.' + get_class($scope)
        );
    }

    getGlobalScopes() {
        return Array.filter(this.constructor.$globalScopes, this.constructor, []);
    }
}
