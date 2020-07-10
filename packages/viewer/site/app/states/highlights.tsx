// @refresh reset
import { last } from "lodash"
import { Project } from "./index"
import { S, createState } from "@state-designer/react"

type HighlightData = {
  event: string | null
  state: string | null
  path: string | null
  scrollToLine: boolean
  targets: string[]
  eventButtonRefs: Map<string, Map<string, React.RefObject<HTMLDivElement>>>
  nodeRefs: Map<string, React.RefObject<HTMLDivElement>>
}

const initialData: HighlightData = {
  event: null,
  state: null,
  path: null,
  scrollToLine: false,
  targets: [],
  eventButtonRefs: new Map([]),
  nodeRefs: new Map([]),
}

export const Highlights = createState({
  data: initialData,
  initial: "highlit",
  states: {
    idle: {
      on: {
        HIGHLIT_EVENT: { do: "setEventHighlight", to: "highlit" },
        HIGHLIT_STATE: { do: "setStateHighlight", to: "highlit" },
      },
    },
    highlit: {
      on: {
        CLEARED_HIGHLIGHTS: {
          do: [
            () => console.log("clearing"),
            "clearEventHighlight",
            "clearStateHighlight",
          ],
          to: "idle",
        },
        CLEARED_EVENT_HIGHLIGHT: { do: "clearEventHighlight", to: "idle" },
        CLEARED_STATE_HIGHLIGHT: { do: "clearStateHighlight", to: "idle" },
        HIGHLIT_EVENT: { do: ["clearEventHighlight", "setEventHighlight"] },
        HIGHLIT_STATE: { do: ["clearStateHighlight", "setStateHighlight"] },
      },
    },
  },
  on: {
    MOUNTED_NODE: "updateNodeRefs",
    MOUNTED_EVENT_BUTTON: "updateEventButtonRefs",
  },
  actions: {
    setEventHighlight(data, { eventName, shiftKey, targets }) {
      data.state = null
      data.event = eventName
      data.targets = targets || []
      data.scrollToLine = shiftKey
    },
    setStateHighlight(data, { path, stateName, shiftKey }) {
      data.state = stateName
      data.event = null
      data.path = path
      data.scrollToLine = shiftKey
    },
    clearStateHighlight(data) {
      data.state = null
      data.path = null
      data.scrollToLine = false
    },
    clearEventHighlight(data) {
      data.event = null
      data.targets = []
      data.scrollToLine = false
    },
    updateNodeRefs(data, { path, ref }) {
      data.nodeRefs.set(path, ref)
    },
    updateEventButtonRefs(data, { path, name, ref }) {
      let state = data.eventButtonRefs.get(path)
      if (!state) {
        state = new Map<string, React.RefObject<HTMLDivElement>>([])
      }
      state.set(name, ref)
      data.eventButtonRefs.set(path, state)
    },
  },
  values: {
    highlitStateRef(data) {
      const current = data.nodeRefs.get(data.path)?.current

      if (!current) return null

      return current
    },
    targets(data) {
      const nodes = data.targets
        .map((path) => {
          const targets = findTransitionTargets(
            Project.data.captive.stateTree,
            path
          )
          return last(targets)
        })
        .filter(Boolean)

      const targets = nodes.map((node) => ({
        node,
        ref: data.nodeRefs.get(node.path),
      }))

      return targets
    },
  },
})

// Helper (copied from @state-designer/core)

export function findTransitionTargets<D = any>(
  state: S.State<D, unknown>,
  path: string
): S.State<D, unknown>[] {
  const acc: S.State<D, unknown>[] = []

  let safePath = path.startsWith(".") ? path : "." + path

  if (state.path.endsWith(safePath)) {
    acc.push(state)
  }

  for (let childState of Object.values(state.states)) {
    acc.push(...findTransitionTargets(childState, path))
  }

  return acc
}
