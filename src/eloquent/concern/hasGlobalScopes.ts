/**
 * Class HasGlobalScopes.
 */
class HasGlobalScopes {

    /**
     * Register a new global scope on the model.
     *
     * @param scope - Scope name, closure or instance.
     * @param implementation - Scope implementation.
     * @returns Scope implementation.
     */
    public addGlobalScope(scope: any, implementation: any = null): any {
        const constructor = this.constructor as any;
        if (typeof scope === 'string' && implementation !== null && implementation !== undefined) {
            return (constructor.$globalScopes[constructor.class][scope] = implementation);
        } else if (typeof scope === 'function') {
            return (constructor.$globalScopes[constructor.class][scope.name || 'closure'] = scope);
        } else if (scope && typeof scope === 'object') {
            return (constructor.$globalScopes[constructor.class][scope.constructor?.name || 'scope'] = scope);
        }

        throw new Error('Global scope must be an instance of Closure or Scope.');
    }

    /**
     * Determine if a model has a global scope.
     *
     * @param scope - Scope identifier.
     * @returns True if global scope exists.
     */
    public hasGlobalScope(scope: any): boolean {
        return (this.constructor as any).getGlobalScope(scope) != null;
    }

    /**
     * Get a global scope registered with the model.
     *
     * @param scope - Scope identifier.
     * @returns Scope implementation or undefined.
     */
    public getGlobalScope(scope: any): any {
        const constructor = this.constructor as any;
        if (typeof scope === 'string') {
            return constructor.$globalScopes?.[constructor.class]?.[scope];
        }

        return constructor.$globalScopes?.[constructor.class]?.[scope?.constructor?.name];
    }

    /**
     * Get the global scopes for this class instance.
     *
     * @returns Global scopes dictionary or array.
     */
    public getGlobalScopes(): any {
        return (this.constructor as any).$globalScopes || {};
    }
}

export default HasGlobalScopes;
