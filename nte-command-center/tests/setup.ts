// React needs to be told it is inside act() territory, or every state update
// in these tests prints a warning that is not about anything.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
