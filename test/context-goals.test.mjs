import test from "node:test"
import assert from "node:assert/strict"
import { buildMissingContextFields, groupContextEntry, suggestContextGoal } from "../src/context-goals.mjs"

test("context goals suggest laptop fields from a user goal", () => {
  const goal = suggestContextGoal("I am looking for a laptop for college")
  assert.equal(goal.id, "shopping_laptop")
  assert.ok(goal.fields.some((field) => field.field_path === "shopping.laptop.budget"))
})

test("context goals return missing fields without overwriting accepted memory", () => {
  const result = buildMissingContextFields("planning meals and workouts", [
    { field_path: "fitness.goal", status: "accepted", value: "build muscle" },
    { field_path: "diet.preference", status: "pending", value: "vegetarian" }
  ])

  assert.equal(result.goal.id, "fitness_setup")
  assert.deepEqual(result.saved_fields.map((field) => field.field_path), ["fitness.goal"])
  assert.ok(result.missing_fields.some((field) => field.field_path === "diet.preference"))
})

test("context goals infer group and subgroup from field paths", () => {
  const result = groupContextEntry({ field_path: "shopping.laptop.budget" })
  assert.deepEqual(result, { group: "shopping", subgroup: "laptop" })
})
