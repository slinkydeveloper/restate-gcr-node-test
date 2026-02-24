import * as restate from "@restatedev/restate-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetStateRequest {
    stack_id: string;
    step_id: number;
    value: unknown;
}

export interface GetStateRequest {
    stack_id: string;
    step_id: number;
}

// ---------------------------------------------------------------------------
// DossDataStore: state management virtual object
// ---------------------------------------------------------------------------

function resultKey(stackId: string, stepId: number): string {
    return `${stackId}/${stepId}/result`;
}

export const dossDataStore = restate.object({
    name: "DossDataStore",
    handlers: {
        /**
         * Clears all state for this object key.
         */
        cleanup: restate.createObjectHandler({ enableLazyState: true }, async (ctx: restate.ObjectContext) => {
            ctx.clearAll();
        }),

        /**
         * Reads a previously stored value from state.
         * Shared handler — can run concurrently with other shared handlers.
         */
        get_state: restate.createObjectSharedHandler({ enableLazyState: true },
            async (
                ctx: restate.ObjectSharedContext,
                request: GetStateRequest
            ): Promise<unknown> => {
                const key = resultKey(request.stack_id, request.step_id);
                const value = await ctx.get<unknown>(key);
                return value ?? null;
            }
        ),

        /**
         * Writes a value into state.
         */
        set_state: restate.createObjectHandler({ enableLazyState: true }, async (
            ctx: restate.ObjectContext,
            request: SetStateRequest
        ) => {
            const key = resultKey(request.stack_id, request.step_id);
            ctx.set(key, request.value);
            // await ctx.run("flush", () => {});
        }),
    },
});

export type DossDataStore = typeof dossDataStore;


restate.serve({
  services: [dossDataStore]
});
