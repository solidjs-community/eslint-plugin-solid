import { TSESLint, TSESTree as T } from "@typescript-eslint/utils";
import { ProgramOrFunctionNode, FunctionNode } from "../../utils";
import type { ReactivityPluginApi } from "./pluginApi";

interface TrackedScope {
  /**
   * The root node, usually a function or JSX expression container, to allow
   * reactive variables under.
   */
  node: T.Node;
  /**
   * The reactive variable should be one of these types:
   * - "tracked-scope": synchronous function or signal variable, or JSX container/spread
   * - "called-function": synchronous or asynchronous function like a timer or
   *   event handler that isn't really a tracked scope but allows reactivity
   */
  expect: "tracked-scope" | "called-function";
}

export interface VirtualReference {
  /**
   * The node, commonly an identifier, where reactivity is referenced.
   */
  node: T.Node;
  /**
   * The scope where the variable `node` is referencing is declared, or `null` if no variable.
   * Since reactivity is, by definition, set up once and accessed multiple times, the final
   * call or property access in a reactive expression's `path` is the access that's reactive.
   * Previous `path` segments just describe the API. It's safe to assume that the second-to-last
   * `path` segment defines the declaration scope unless the reactive expression is a derived signal.
   * 
   * @example
   * function Component() {
   *   const [signal1] = createSignal(42);
   *   const signal2 = createSignal(42)[0];
   *   const signal3 = createSignal(42)[0];
   *   const d = () => {
   *     console.log(signal()); // declarationScope === Component
   *   }
   *   console.log(createSignal(42)[0]()); // declarationScope === 
   */
  declarationScope: ReactivityScope | null;
}

function isRangeWithin(inner: T.Range, outer: T.Range): boolean {
  return inner[0] >= outer[0] && inner[1] <= outer[1];
}

export class ReactivityScope {
  constructor(
    public node: ProgramOrFunctionNode,
    public parentScope: ReactivityScope | null
  ) {}

  childScopes: Array<ReactivityScope> = [];
  trackedScopes: Array<TrackedScope> = [];
  errorContexts: Array<T.Node> = [];
  references: Array<VirtualReference> = [];
  hasJSX = false;

  deepestScopeContaining(node: T.Node | T.Range): ReactivityScope | null {
    const range = Array.isArray(node) ? node : node.range;
    if (isRangeWithin(range, this.node.range)) {
      const matchedChildRange = this.childScopes.find((scope) =>
        scope.deepestScopeContaining(range)
      );
      return matchedChildRange ?? this;
    }
    return null;
  }

  isDeepestScopeFor(node: T.Node | T.Range) {
    return this.deepestScopeContaining(Array.isArray(node) ? node : node.range) === this;
  }

  *walk(): Iterable<ReactivityScope> {
    yield this;
    for (const scope of this.childScopes) {
      yield* scope.walk();
    }
  }

  private *iterateUpwards<T>(prop: (scope: ReactivityScope) => Iterable<T>): Iterable<T> {
    yield* prop(this);
    if (this.parentScope) {
      yield* this.parentScope.iterateUpwards(prop);
    }
  }
}

// class ReactivityScopeTree {
//   constructor(public root: ReactivityScope) {}
//   syncCallbacks = new Set<FunctionNode>();

//   /** Finds the deepest ReactivityScope containing a given range, or null if the range extends beyond the code length. */
//   deepestScopeContaining = this.root.deepestScopeContaining.bind(this.root);
//   // (node: T.Node | T.Range): ReactivityScope | null {
//   //   return this.root.deepestScopeContaining(range);
//   // }

// }
