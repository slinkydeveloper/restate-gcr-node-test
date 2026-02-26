import * as restate from "@restatedev/restate-sdk";
import {z} from 'zod'
import {setTimeout} from 'node:timers/promises'

const RunInput = z.object({
    steps: z.number().int().min(1).default(5),
    payloadSizeBytes: z.number().int().min(0).default(1024),
    stepLatencyMs: z.number().int().min(0).default(100),
})

const RunOutput = z.object({
    steps: z.number(),
    payloadSizeBytes: z.number(),
    stepLatencyMs: z.number(),
    totalElapsedMs: z.number(),
})

// Sequential ctx.run() steps with configurable count, payload, and latency.
// Tests: 1.1, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
export const linearPipeline = restate.service({
    name: 'LinearPipeline',
    handlers: {
        run: restate.createServiceHandler(
            {
                input: restate.serde.schema(RunInput),
                output: restate.serde.schema(RunOutput),
            },
            async (ctx: restate.Context, input) => {
                const {steps, payloadSizeBytes, stepLatencyMs} = input

                const startTime = Date.now()

                for (let i = 0; i < steps; i++) {
                    await ctx.run(`step-${i}`, async () => {
                        if (stepLatencyMs > 0) {
                            await setTimeout(stepLatencyMs)
                        }
                        if (payloadSizeBytes > 0) {
                            return 'x'.repeat(payloadSizeBytes)
                        }
                        return 'done'
                    })
                }

                const totalElapsedMs = Date.now() - startTime
                return {steps, payloadSizeBytes, stepLatencyMs, totalElapsedMs}
            },
        ),
    },
})

restate.serve({
    services: [linearPipeline]
});
